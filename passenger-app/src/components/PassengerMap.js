'use dom';
// Passenger map (MapLibre in an Expo DOM component). Everything is plain data so updates are in place.
//   buses:  [{ id, lat, lng, label, stock, ink, selected, dim }]
//   lines:  [{ id, coordinates, color, dashed, width }]   route segments and walking legs
//   stops:  [{ id, lat, lng, name, color, big }]
//   me:     { lat, lng } | null       from / to: { lat, lng } | null
//   fitKey: changes -> fit everything in view
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL, INDIA_VIEW } from 'transit-shared/mapConfig.js';

const EMPTY = { type: 'FeatureCollection', features: [] };
const GLIDE = 1000;

export default function PassengerMap({ buses = [], lines = [], stops = [], me = null, from = null, to = null, fitKey = '', padding = null, night = false, onBusPress, onStopPress }) {
  const el = useRef(null);
  const map = useRef(null);
  const loaded = useRef(false);
  const markers = useRef(new Map());
  const pins = useRef({});
  const latest = useRef({});
  latest.current = { lines, stops, buses, me, from, to, padding };

  const paintLayers = () => {
    const m = map.current;
    if (!loaded.current) return;
    const s = latest.current;
    m.getSource('lines').setData({
      type: 'FeatureCollection',
      features: s.lines.filter((l) => l.coordinates?.length > 1).map((l) => ({
        type: 'Feature', properties: { color: l.color, width: l.width || 5, dashed: Boolean(l.dashed) },
        geometry: { type: 'LineString', coordinates: l.coordinates }
      }))
    });
    m.getSource('stops').setData({
      type: 'FeatureCollection',
      features: s.stops.map((st) => ({ type: 'Feature', properties: { id: st.id, name: st.name, color: st.color || '#16213E', big: Boolean(st.big) }, geometry: { type: 'Point', coordinates: [st.lng, st.lat] } }))
    });
  };

  const fit = () => {
    const m = map.current;
    const s = latest.current;
    const pts = [
      ...s.lines.flatMap((l) => l.coordinates || []),
      ...s.stops.map((st) => [st.lng, st.lat]),
      // `me` only matters when the trip starts at the current location (from == null);
      // otherwise a far-away phone position would zoom the map out to the whole country.
      ...[s.from ? null : s.me, s.from, s.to].filter(Boolean).map((p) => [p.lng, p.lat]),
      ...(s.lines.length ? [] : s.buses.map((b) => [b.lng, b.lat]))
    ];
    if (!pts.length) return;
    const bounds = pts.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    m.fitBounds(bounds, { padding: s.padding || 60, maxZoom: 15.5, duration: 800 });
  };

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current, style: MAP_STYLE_URL, center: INDIA_VIEW.center, zoom: INDIA_VIEW.zoom, attributionControl: { compact: true } });
    map.current = m;
    markers.current = new Map();
    pins.current = {};
    m.on('load', () => {
      m.addSource('lines', { type: 'geojson', data: EMPTY });
      m.addSource('stops', { type: 'geojson', data: EMPTY });
      m.addLayer({ id: 'lines-casing', type: 'line', source: 'lines', filter: ['!', ['get', 'dashed']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FBFBF8', 'line-width': ['+', ['get', 'width'], 4] } });
      m.addLayer({ id: 'lines-solid', type: 'line', source: 'lines', filter: ['!', ['get', 'dashed']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'] } });
      m.addLayer({ id: 'lines-dashed', type: 'line', source: 'lines', filter: ['get', 'dashed'], layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 3.5, 'line-dasharray': [0.5, 1.6] } });
      m.addLayer({ id: 'stops-circle', type: 'circle', source: 'stops', paint: {
        'circle-radius': ['case', ['get', 'big'], 8, 5.5], 'circle-color': '#FBFBF8',
        'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': ['case', ['get', 'big'], 3.5, 2.5]
      } });
      m.addLayer({ id: 'stops-label', type: 'symbol', source: 'stops', minzoom: 12.5, layout: {
        'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 12.5, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true
      }, paint: { 'text-color': '#16213E', 'text-halo-color': '#FBFBF8', 'text-halo-width': 1.6 } });
      m.on('click', 'stops-circle', (e) => onStopPress?.(e.features[0].properties.id));
      m.on('mouseenter', 'stops-circle', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'stops-circle', () => { m.getCanvas().style.cursor = ''; });
      loaded.current = true;
      paintLayers();
      fit();
    });
    return () => { m.remove(); loaded.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(paintLayers, [lines, stops]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (loaded.current) fit(); }, [fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bus markers: ticket-like labels that glide between positions.
  useEffect(() => {
    const m = map.current;
    const seen = new Set();
    for (const b of buses) {
      if (b.lat == null) continue;
      seen.add(b.id);
      let entry = markers.current.get(b.id);
      if (!entry) {
        const node = document.createElement('button');
        node.style.cssText = 'font:800 14px "Anek Latin",system-ui,sans-serif;font-variant-numeric:tabular-nums;min-width:34px;height:26px;padding:0 6px;border-radius:6px;cursor:pointer;box-shadow:0 4px 10px -4px rgba(22,33,62,.5);transition:transform .18s cubic-bezier(.16,1,.3,1),opacity .2s;';
        node.addEventListener('click', (e) => { e.stopPropagation(); onBusPress?.(entry.id); });
        entry = { id: b.id, node, marker: new maplibregl.Marker({ element: node }).setLngLat([b.lng, b.lat]).addTo(m), raf: 0 };
        markers.current.set(b.id, entry);
      }
      const { node } = entry;
      node.textContent = b.label;
      node.style.background = '#16213E';
      node.style.color = '#FBFBF8';
      node.style.border = `2px solid ${b.stock || '#BFE6CF'}`;
      node.style.transform = b.selected ? 'scale(1.18)' : 'scale(1)';
      node.style.opacity = b.dim ? '0.35' : '1';
      node.style.zIndex = b.selected ? '3' : '2';
      const to = [b.lng, b.lat];
      const fromPos = entry.marker.getLngLat().toArray();
      if (to[0] !== fromPos[0] || to[1] !== fromPos[1]) {
        cancelAnimationFrame(entry.raf);
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / GLIDE);
          const e = 1 - Math.pow(1 - t, 3);
          entry.marker.setLngLat([fromPos[0] + (to[0] - fromPos[0]) * e, fromPos[1] + (to[1] - fromPos[1]) * e]);
          if (t < 1) entry.raf = requestAnimationFrame(step);
        };
        entry.raf = requestAnimationFrame(step);
      }
    }
    for (const [id, entry] of markers.current) {
      if (!seen.has(id)) { cancelAnimationFrame(entry.raf); entry.marker.remove(); markers.current.delete(id); }
    }
  }, [buses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Me (blue dot) and from/to pins
  useEffect(() => {
    const m = map.current;
    const place = (key, point, make) => {
      if (!point) { pins.current[key]?.remove(); delete pins.current[key]; return; }
      if (!pins.current[key]) pins.current[key] = new maplibregl.Marker({ element: make(), anchor: key === 'me' ? 'center' : 'bottom' }).setLngLat([point.lng, point.lat]).addTo(m);
      else pins.current[key].setLngLat([point.lng, point.lat]);
    };
    place('me', me, () => {
      const d = document.createElement('div');
      d.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#1D4F8F;border:3px solid #FBFBF8;box-shadow:0 0 0 6px rgba(29,79,143,.18);';
      return d;
    });
    const pin = (label, bg) => () => {
      const d = document.createElement('div');
      d.style.cssText = `font:700 12px "Anek Latin",system-ui,sans-serif;background:${bg};color:#FBFBF8;padding:3px 8px;border-radius:4px;box-shadow:0 4px 10px -4px rgba(22,33,62,.5);transform:translateY(-4px);`;
      d.textContent = label;
      return d;
    };
    place('from', from, pin('A', '#16213E'));
    place('to', to, pin('B', '#A3184A'));
  }, [me, from, to]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={el} style={{ width: '100%', height: '100%', background: '#E8EAE4', filter: night ? 'invert(0.9) hue-rotate(180deg) brightness(0.95) contrast(0.9)' : undefined }} />
    </div>
  );
}
