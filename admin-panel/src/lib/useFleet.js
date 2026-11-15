import { useCallback, useEffect, useMemo, useState } from 'react';
import { busAPI, publicAPI } from './api';
import { useRealtime, useRealtimeEvents } from './realtime';
import { ageSeconds } from '@/components/ticket';

const routeCache = new Map(); // routeId -> Promise<route details>

/** Route with ordered stops + road path (cached for the session). */
export function loadRoute(id) {
  if (!routeCache.has(id)) {
    routeCache.set(id, publicAPI.route(id).then((r) => r.data).catch((e) => { routeCache.delete(id); throw e; }));
  }
  return routeCache.get(id);
}

export function useRoutes(ids) {
  const [routes, setRoutes] = useState({});
  const key = [...new Set(ids.filter(Boolean))].sort().join(',');
  useEffect(() => {
    let alive = true;
    key.split(',').filter(Boolean).forEach((id) => {
      loadRoute(id).then((route) => alive && setRoutes((prev) => (prev[id] ? prev : { ...prev, [id]: route }))).catch(() => {});
    });
    return () => { alive = false; };
  }, [key]);
  return routes;
}

/** How urgently a bus needs the admin's eye (lower = more urgent). */
export function attentionRank(bus) {
  if (bus.status === 'breakdown') return 0;
  if (bus.live?.offRoute) return 1;
  if (ageSeconds(bus.live?.lastUpdate) > 60) return 2;
  if (bus.live?.delayMinutes > 5) return 3;
  return 4;
}

/** Buses currently on a trip, merged with their live position, ranked by attention. */
export function useFleet() {
  const { buses: live } = useRealtime();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    busAPI.getActive()
      .then((r) => { setDocs(r.data); setError(null); })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useRealtimeEvents((event) => {
    if (['trip-started', 'trip-ended', 'breakdown-alert'].includes(event)) reload();
  });

  const fleet = useMemo(() => docs
    .map((bus) => ({ ...bus, live: live[bus._id] || bus.live }))
    .sort((a, b) => attentionRank(a) - attentionRank(b) || String(a.busNumber).localeCompare(String(b.busNumber), undefined, { numeric: true })),
  [docs, live]);

  const routes = useRoutes(fleet.map((b) => b.route?._id));
  return { fleet, routes, loading, error, reload };
}
