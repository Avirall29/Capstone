// MapLibre map on OpenFreeMap vector tiles. Routes and stops are GeoJSON layers; buses and incidents
// are HTML markers. Bus markers glide between GPS points (1 s) instead of jumping.
import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL, INDIA_VIEW } from '@shared/mapConfig.js';
import { colors } from '@shared/theme/tokens.js';
import { cn } from '@/lib/utils';

// MapLibre 6 runs tile parsing in a module worker; point it at the bundled file explicitly
// (Vite's dependency pre-bundling otherwise breaks the worker URL).
maplibregl.setWorkerUrl(maplibreWorkerUrl);

const EMPTY = { type: 'FeatureCollection', features: [] };
const GLIDE_MS = 1000;
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const routesGeoJSON = (routes = []) => ({
  type: 'FeatureCollection',
  features: routes.filter((r) => r.coordinates?.length >= 2).map((r) => ({
    type: 'Feature',
    properties: { id: r.id, color: r.color || colors.ink, width: r.highlighted ? 6 : 4, opacity: r.dimmed ? 0.35 : 1 },
    geometry: { type: 'LineString', coordinates: r.coordinates }
  }))
});

const stopsGeoJSON = (stops = []) => ({
  type: 'FeatureCollection',
  features: stops.map((s) => ({
    type: 'Feature',
    properties: { id: s.id, name: s.name, color: s.color || colors.ink, highlighted: Boolean(s.highlighted), label: s.label ?? '' },
    geometry: { type: 'Point', coordinates: [s.lng, s.lat] }
  }))
});

function addLayers(map) {
  map.addSource('routes', { type: 'geojson', data: EMPTY });
  map.addSource('stops', { type: 'geojson', data: EMPTY });
  map.addSource('trail', { type: 'geojson', data: EMPTY });
  map.addLayer({ id: 'routes-casing', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colors.counterfoil, 'line-width': ['+', ['get', 'width'], 4], 'line-opacity': ['get', 'opacity'] } });
  map.addLayer({ id: 'routes-line', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'] } });
  map.addLayer({ id: 'trail-line', type: 'line', source: 'trail', layout: { 'line-cap': 'round' },
    paint: { 'line-color': colors.signal, 'line-width': 3, 'line-dasharray': [1.5, 1.5] } });
  // Stops are punch holes: counterfoil disc with a stock-ink ring.
  map.addLayer({ id: 'stops-circle', type: 'circle', source: 'stops',
    paint: {
      'circle-radius': ['case', ['get', 'highlighted'], 8, 5.5],
      'circle-color': colors.counterfoil,
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': ['case', ['get', 'highlighted'], 3.5, 2.5]
    } });
  map.addLayer({ id: 'stops-label', type: 'symbol', source: 'stops', minzoom: 12.5,
    layout: {
      'text-field': ['case', ['!=', ['get', 'label'], ''], ['get', 'label'], ['get', 'name']],
      'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true
    },
    paint: { 'text-color': colors.ink, 'text-halo-color': colors.counterfoil, 'text-halo-width': 1.5 } });
}

export default function MapView({
  routes, stops, buses = [], incidents = [], trail,
  fitKey, fitPadding = 60, onBusClick, onStopClick, onMapClick, className, interactiveStops = true
}) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const loaded = useRef(false);
  const busMarkers = useRef(new Map());
  const incidentMarkers = useRef(new Map());
  const handlers = useRef({});
  handlers.current = { onBusClick, onStopClick, onMapClick };
  const latest = useRef({});
  latest.current = { routes, stops, trail };

  // Create the map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE_URL,
      center: INDIA_VIEW.center,
      zoom: INDIA_VIEW.zoom,
      attributionControl: { compact: true }
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('load', () => {
      addLayers(map);
      loaded.current = true;
      const { routes: r, stops: s, trail: t } = latest.current;
      map.getSource('routes').setData(routesGeoJSON(r));
      map.getSource('stops').setData(stopsGeoJSON(s));
      map.getSource('trail').setData(t?.length > 1 ? { type: 'Feature', geometry: { type: 'LineString', coordinates: t } } : EMPTY);
      map.fire('data-ready');
    });
    map.on('click', (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: loaded.current ? ['stops-circle'] : [] })[0];
      if (hit && handlers.current.onStopClick) handlers.current.onStopClick(hit.properties.id);
      else handlers.current.onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    map.on('mousemove', (e) => {
      if (!loaded.current) return;
      const over = interactiveStops && map.queryRenderedFeatures(e.point, { layers: ['stops-circle'] }).length > 0;
      map.getCanvas().style.cursor = over ? 'pointer' : handlers.current.onMapClick ? 'crosshair' : '';
    });
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      map.remove();
      loaded.current = false;
      busMarkers.current.clear();
      incidentMarkers.current.clear();
    };
  }, [interactiveStops]);

  // GeoJSON layers
  useEffect(() => {
    if (loaded.current) mapRef.current.getSource('routes').setData(routesGeoJSON(routes));
  }, [routes]);
  useEffect(() => {
    if (loaded.current) mapRef.current.getSource('stops').setData(stopsGeoJSON(stops));
  }, [stops]);
  useEffect(() => {
    if (loaded.current) {
      mapRef.current.getSource('trail').setData(trail?.length > 1 ? { type: 'Feature', geometry: { type: 'LineString', coordinates: trail } } : EMPTY);
    }
  }, [trail]);

  // Bus markers with gliding movement
  useEffect(() => {
    const map = mapRef.current;
    const seen = new Set();
    for (const bus of buses) {
      if (bus.lat == null || bus.lng == null) continue;
      seen.add(bus.id);
      let entry = busMarkers.current.get(bus.id);
      if (!entry) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'bus-marker';
        el.addEventListener('click', (e) => { e.stopPropagation(); handlers.current.onBusClick?.(entry.id); });
        const marker = new maplibregl.Marker({ element: el }).setLngLat([bus.lng, bus.lat]).addTo(map);
        entry = { id: bus.id, el, marker, pos: [bus.lng, bus.lat], raf: 0 };
        busMarkers.current.set(bus.id, entry);
      }
      entry.el.textContent = bus.label;
      entry.el.setAttribute('aria-label', `Bus ${bus.label}`);
      entry.el.style.setProperty('--stock', bus.color || colors.counterfoil);
      entry.el.dataset.selected = Boolean(bus.selected);
      entry.el.dataset.alert = Boolean(bus.alert);
      entry.el.dataset.stale = Boolean(bus.stale);
      entry.marker.getElement().style.zIndex = bus.selected || bus.alert ? '3' : '2';

      const target = [bus.lng, bus.lat];
      if (target[0] !== entry.pos[0] || target[1] !== entry.pos[1]) {
        cancelAnimationFrame(entry.raf);
        const from = entry.marker.getLngLat().toArray();
        entry.pos = target;
        if (reduceMotion()) {
          entry.marker.setLngLat(target);
        } else {
          const start = performance.now();
          const step = (now) => {
            const t = Math.min(1, (now - start) / GLIDE_MS);
            const e = 1 - Math.pow(1 - t, 3);
            entry.marker.setLngLat([from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e]);
            if (t < 1) entry.raf = requestAnimationFrame(step);
          };
          entry.raf = requestAnimationFrame(step);
        }
      }
    }
    for (const [id, entry] of busMarkers.current) {
      if (!seen.has(id)) {
        cancelAnimationFrame(entry.raf);
        entry.marker.remove();
        busMarkers.current.delete(id);
      }
    }
  }, [buses]);

  // Incident markers (pulsing)
  useEffect(() => {
    const map = mapRef.current;
    const seen = new Set();
    for (const inc of incidents) {
      if (inc.lat == null) continue;
      seen.add(inc.id);
      let entry = incidentMarkers.current.get(inc.id);
      if (!entry) {
        const el = document.createElement('div');
        el.className = 'incident-marker';
        el.title = inc.title || 'Incident';
        entry = { marker: new maplibregl.Marker({ element: el }).setLngLat([inc.lng, inc.lat]).addTo(map) };
        incidentMarkers.current.set(inc.id, entry);
      }
      entry.marker.setLngLat([inc.lng, inc.lat]);
    }
    for (const [id, entry] of incidentMarkers.current) {
      if (!seen.has(id)) { entry.marker.remove(); incidentMarkers.current.delete(id); }
    }
  }, [incidents]);

  // Fit to everything shown when fitKey changes.
  useEffect(() => {
    if (fitKey === undefined) return;
    const map = mapRef.current;
    const fit = () => {
      const pts = [
        ...(routes || []).flatMap((r) => r.coordinates || []),
        ...(stops || []).map((s) => [s.lng, s.lat]),
        ...buses.filter((b) => b.lat != null).map((b) => [b.lng, b.lat]),
        ...incidents.filter((i) => i.lat != null).map((i) => [i.lng, i.lat]),
        ...(trail || [])
      ];
      if (!pts.length) return;
      const bounds = pts.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
      map.fitBounds(bounds, { padding: fitPadding, maxZoom: 15, duration: reduceMotion() ? 0 : 900 });
    };
    if (loaded.current) fit();
    else map.once('data-ready', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return <div ref={container} className={cn('w-full h-full bg-[#E8EAE4]', className)} />;
}
