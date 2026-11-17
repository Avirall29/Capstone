// Live buses for the whole app: one socket, subscribed to every route's room.
// Rooms are lost when the connection drops, so every (re)connect refetches and resubscribes.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { api, SOCKET_URL } from './api';
import { useAuth } from './auth';

const LiveContext = createContext(null);

export function LiveProvider({ children }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [buses, setBuses] = useState({});
  const [routes, setRoutes] = useState([]);
  const [alert, setAlert] = useState(null); // latest arrival alert (in-app banner)
  const routeDetails = useRef(new Map());

  const load = useCallback(async (socket) => {
    try {
      const [rs, live] = await Promise.all([api.get('/public/routes', { token: null }), api.get('/public/buses/active', { token: null })]);
      setRoutes(rs);
      setBuses(Object.fromEntries(live.map((b) => [b.busId, b])));
      rs.forEach((r) => socket?.emit('subscribe-route', r._id));
    } catch {
      // offline: keep what we have
    }
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'], auth: token ? { token } : {} });
    socket.on('connect', () => load(socket));
    socket.on('location-update', (bus) => setBuses((prev) => ({ ...prev, [bus.busId]: bus })));
    socket.on('trip-ended', ({ busId }) => setBuses((prev) => {
      const next = { ...prev };
      delete next[busId];
      return next;
    }));
    socket.on('trip-started', () => load(socket));
    socket.on('arrival-alert', (a) => {
      const text = t('passenger.busClose', { bus: a.busNumber, stops: t('passenger.stops', { count: a.stopsAway }), stop: a.stopName });
      setAlert({ ...a, text, at: Date.now() });
      if (Platform.OS !== 'web') {
        Notifications.scheduleNotificationAsync({ content: { title: text, body: a.minutes != null ? t('passenger.inMin', { count: a.minutes }) : '' }, trigger: null }).catch(() => {});
      }
    });
    load(null);
    return () => socket.close();
  }, [token, load, t]);

  /** Route with stops + path (cached). */
  const getRoute = useCallback((id) => {
    if (!routeDetails.current.has(id)) {
      routeDetails.current.set(id, api.get(`/public/routes/${id}`, { token: null }).catch((e) => { routeDetails.current.delete(id); throw e; }));
    }
    return routeDetails.current.get(id);
  }, []);

  const value = useMemo(() => ({ buses, routes, getRoute, alert, clearAlert: () => setAlert(null) }), [buses, routes, getRoute, alert]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);
