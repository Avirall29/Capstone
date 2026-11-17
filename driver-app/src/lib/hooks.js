import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialWarningState, stepWarnings } from 'transit-shared/locationWarnings.js';
import { buildPathIndex, projectOntoPath } from 'transit-shared/geo.js';
import { api } from './api';
import { fromLocation, sendPoint, isBackgroundTracking, queueSize, flushQueue } from './tracking';
import { notify } from './notifications';

/** The signed-in driver's bus, route and active trip. */
export function useDriverState(onUnauthorized) {
  const [data, setData] = useState({ loading: true, me: null, trip: null, error: null });
  const refresh = useCallback(async () => {
    try {
      const [me, trip] = await Promise.all([api.get('/auth/driver/me'), api.get('/trips/driver/active')]);
      setData({ loading: false, me, trip, error: null });
    } catch (error) {
      if (error.status === 401) onUnauthorized?.();
      setData((d) => ({ ...d, loading: false, error }));
    }
  }, [onUnauthorized]);
  useEffect(() => { refresh(); }, [refresh]);
  return { ...data, refresh, setTrip: (trip) => setData((d) => ({ ...d, trip })) };
}

/** Foreground GPS for the UI (smooth, accurate). Re-subscribes when location comes back on. */
export function useWatchPosition(enabled, restartKey) {
  const [position, setPosition] = useState(null);
  const [permission, setPermission] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let sub;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);
      if (status !== 'granted' || cancelled) return;
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 }).catch(() => null);
      if (last && !cancelled) setPosition(fromLocation(last));
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => setPosition(fromLocation(loc)),
        () => {}
      ).catch(() => null);
      if (cancelled) sub?.remove();
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [enabled, restartKey]);
  return { position, permission };
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);
  return online;
}

/**
 * During a trip, every 5 s: send the latest position (when the background task isn't running),
 * otherwise read the bus's live view. Returns the server's live view + offline queue size.
 */
export function useTripLoop({ trip, position, online, onUnauthorized }) {
  const [view, setView] = useState(trip?.live || null);
  const [queued, setQueued] = useState(0);
  const pos = useRef(position);
  pos.current = position;

  useEffect(() => {
    if (!trip) return undefined;
    let alive = true;
    const tick = async () => {
      const p = pos.current;
      const fresh = p && Date.now() - new Date(p.timestamp).getTime() < 15000;
      try {
        const next = !(await isBackgroundTracking()) && fresh
          ? await sendPoint(trip._id, p)
          : await api.get(`/public/buses/${trip.bus._id}`, { token: null });
        if (alive && next) setView(next);
      } catch (error) {
        if (error.status === 401) onUnauthorized?.();
      }
      if (alive) setQueued(await queueSize());
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [trip?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (online && trip) flushQueue(trip._id).then(async () => setQueued(await queueSize()));
  }, [online, trip]);

  return { view, queued };
}

/** Ask the OS to turn location on (Android dialog) or open settings (iOS). */
export async function turnOnLocation() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const res = await Location.requestForegroundPermissionsAsync();
      if (res.status !== 'granted') return Linking.openSettings();
    }
    if (Platform.OS === 'android') await Location.enableNetworkProviderAsync();
    else await Linking.openSettings();
  } catch {
    Linking.openSettings();
  }
}

/**
 * Location-off warnings (rules in shared/locationWarnings.js): 15 s off -> warning (max 2, count kept
 * per trip even if location comes back), further 15 s off periods -> admin is notified.
 */
export function useLocationWarnings({ tripId, positionRef, t }) {
  const [locationOn, setLocationOn] = useState(true);
  const [count, setCount] = useState(0);
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    if (!tripId) return undefined;
    let alive = true;
    let state = null;
    const key = `warnings:${tripId}`;

    const check = async () => {
      if (!alive || !state) return;
      const services = await Location.hasServicesEnabledAsync().catch(() => true);
      const perm = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'granted' }));
      const on = services && perm.status === 'granted';
      if (!alive) return;
      setLocationOn(on);
      if (on) setEscalated(false);
      const { state: next, event } = stepWarnings(state, { locationOn: on, now: Date.now() });
      state = next;
      if (!event) return;
      setCount(next.count);
      await AsyncStorage.setItem(key, String(next.count));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      if (event.type === 'warning') {
        notify(t('location.warningTitle', { count: event.count }), t('location.warningBody'));
      } else {
        setEscalated(true);
        notify(t('location.escalatedTitle'), t('location.escalatedBody'));
      }
      const p = positionRef.current;
      api.post(`/trips/${tripId}/location-warning`, {
        count: next.count,
        escalate: event.type === 'escalate',
        ...(p && { location: { lat: p.lat, lng: p.lng } })
      }).catch(() => {});
    };

    (async () => {
      const saved = Number(await AsyncStorage.getItem(key)) || 0;
      state = initialWarningState(saved);
      setCount(saved);
      check();
    })();
    const timer = setInterval(check, 3000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => { alive = false; clearInterval(timer); sub.remove(); };
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { locationOn, count, escalated };
}

/**
 * Re-routing: off the planned path by > 50 m for 3 fixes -> ask the server for road directions from
 * here through the next stops. Refreshes if the driver also leaves the detour. Clears on rejoining.
 */
export function useReroute({ route, position, nextIndex }) {
  const pathIndex = useMemo(() => buildPathIndex(route?.path), [route]);
  const [detour, setDetour] = useState(null);
  const [offRoute, setOffRoute] = useState(false);
  const offCount = useRef(0);
  const lastFetch = useRef(0);
  const fetching = useRef(false);

  useEffect(() => {
    if (!pathIndex || !position) return;
    const offset = projectOntoPath(pathIndex, position)?.offset ?? 0;
    offCount.current = offset > 50 ? offCount.current + 1 : 0;
    const isOff = offCount.current >= 3;
    setOffRoute(isOff);
    if (!isOff) {
      if (detour && offset < 30) setDetour(null);
      return;
    }
    const detourIndex = detour ? buildPathIndex(detour.coordinates) : null;
    const offDetour = detourIndex ? (projectOntoPath(detourIndex, position)?.offset ?? 0) > 60 : true;
    const stale = Date.now() - lastFetch.current > (detour ? 15000 : 0);
    if (fetching.current || !offDetour || !stale) return;

    const targets = route.stops.slice(Math.max(0, nextIndex), Math.max(0, nextIndex) + 3);
    if (!targets.length) return;
    fetching.current = true;
    lastFetch.current = Date.now();
    api.post('/routing/directions', { points: [{ lat: position.lat, lng: position.lng }, ...targets.map(({ lat, lng }) => ({ lat, lng }))] })
      .then((d) => setDetour({ coordinates: d.coordinates, steps: d.steps || [], toStop: targets[0], source: d.source }))
      .catch(() => {})
      .finally(() => { fetching.current = false; });
  }, [position, pathIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return { offRoute, detour };
}
