// Import a GTFS feed (unzipped folder) into Stops and Routes.
// Usage: node scripts/importGtfs.js <gtfs-folder> [--prefix=DL-]
//
// Per GTFS route we keep one representative stop pattern (the direction-0 trip with the most stops),
// timetable offsets from its stop_times, the first-stop departure times of all its direction-0 trips,
// and its shape (shapes.txt) as the road path when available.
// stop_times.txt is streamed twice (pass 1: pick trips, pass 2: collect their stops), so even large
// city feeds fit in memory.
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Stop from '../models/Stop.js';
import Route from '../models/Route.js';

/** Minimal RFC-4180 line splitter (quoted fields, escaped quotes). */
export function parseCsvLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}

async function* rows(file) {
  if (!fs.existsSync(file)) return;
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let header = null;
  for await (const raw of rl) {
    const line = raw.replace(/^﻿/, '');
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (!header) { header = cells.map((h) => h.trim()); continue; }
    yield Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]));
  }
}

const seconds = (hms) => {
  const [h, m, s] = (hms || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 3600 + m * 60 + (s || 0) : null;
};
const hhmm = (secs) => {
  const m = Math.floor(secs / 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export async function importGtfs(dir, { prefix = '', log = console.log } = {}) {
  const file = (name) => path.join(dir, name);

  // Routes and trips
  const routes = new Map();
  for await (const r of rows(file('routes.txt'))) {
    routes.set(r.route_id, { number: prefix + (r.route_short_name || r.route_id), name: r.route_long_name || '', color: r.route_color ? `#${r.route_color}` : undefined });
  }
  const trips = new Map(); // trip_id -> { routeId, shapeId }
  for await (const t of rows(file('trips.txt'))) {
    if ((t.direction_id || '0') !== '0' || !routes.has(t.route_id)) continue;
    trips.set(t.trip_id, { routeId: t.route_id, shapeId: t.shape_id || null });
  }

  // Pass 1: stop count + first departure per trip
  const tripInfo = new Map(); // trip_id -> { count, firstSeq, firstDep }
  for await (const st of rows(file('stop_times.txt'))) {
    if (!trips.has(st.trip_id)) continue;
    const info = tripInfo.get(st.trip_id) || { count: 0, firstSeq: Infinity, firstDep: null };
    info.count++;
    const seq = Number(st.stop_sequence);
    if (seq < info.firstSeq) { info.firstSeq = seq; info.firstDep = seconds(st.departure_time || st.arrival_time); }
    tripInfo.set(st.trip_id, info);
  }
  const representative = new Map(); // routeId -> trip_id
  const departures = new Map(); // routeId -> Set("HH:MM")
  for (const [tripId, info] of tripInfo) {
    const { routeId } = trips.get(tripId);
    const best = representative.get(routeId);
    if (!best || info.count > tripInfo.get(best).count) representative.set(routeId, tripId);
    if (info.firstDep != null) {
      if (!departures.has(routeId)) departures.set(routeId, new Set());
      departures.get(routeId).add(hhmm(info.firstDep));
    }
  }

  // Pass 2: ordered stops of representative trips
  const wanted = new Set(representative.values());
  const patterns = new Map(); // trip_id -> [{ seq, stopId, secs }]
  for await (const st of rows(file('stop_times.txt'))) {
    if (!wanted.has(st.trip_id)) continue;
    if (!patterns.has(st.trip_id)) patterns.set(st.trip_id, []);
    patterns.get(st.trip_id).push({ seq: Number(st.stop_sequence), stopId: st.stop_id, secs: seconds(st.arrival_time || st.departure_time) });
  }

  // Stops used by the patterns
  const usedStops = new Set([...patterns.values()].flat().map((p) => p.stopId));
  const stopIds = new Map();
  for await (const s of rows(file('stops.txt'))) {
    if (!usedStops.has(s.stop_id)) continue;
    const lat = Number(s.stop_lat);
    const lng = Number(s.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const stop = await Stop.findOneAndUpdate(
      { code: prefix + s.stop_id },
      { name: s.stop_name || s.stop_id, code: prefix + s.stop_id, location: { type: 'Point', coordinates: [lng, lat] } },
      { upsert: true, new: true }
    );
    stopIds.set(s.stop_id, stop._id);
  }

  // Shapes of representative trips
  const wantedShapes = new Set([...wanted].map((t) => trips.get(t).shapeId).filter(Boolean));
  const shapes = new Map();
  for await (const p of rows(file('shapes.txt'))) {
    if (!wantedShapes.has(p.shape_id)) continue;
    if (!shapes.has(p.shape_id)) shapes.set(p.shape_id, []);
    shapes.get(p.shape_id).push({ seq: Number(p.shape_pt_sequence), coord: [Number(p.shape_pt_lon), Number(p.shape_pt_lat)] });
  }

  let imported = 0;
  for (const [routeId, tripId] of representative) {
    const pattern = (patterns.get(tripId) || []).sort((a, b) => a.seq - b.seq).filter((p) => stopIds.has(p.stopId));
    if (pattern.length < 2) continue;
    const start = pattern[0].secs ?? 0;
    const shape = shapes.get(trips.get(tripId).shapeId);
    const meta = routes.get(routeId);
    await Route.findOneAndUpdate(
      { number: meta.number },
      {
        ...meta,
        stops: pattern.map((p) => ({ stop: stopIds.get(p.stopId), offsetMinutes: p.secs != null ? Math.round((p.secs - start) / 60) : 0 })),
        departures: [...(departures.get(routeId) || [])].sort(),
        path: { type: 'LineString', coordinates: shape ? shape.sort((a, b) => a.seq - b.seq).map((p) => p.coord) : [] },
        pathSource: shape ? 'manual' : 'straight'
      },
      { upsert: true, new: true }
    );
    imported++;
  }
  log(`Imported ${stopIds.size} stops and ${imported} routes`);
  return { stops: stopIds.size, routes: imported };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/importGtfs.js')) {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(path.join(dir, 'stops.txt'))) {
    console.error('Usage: node scripts/importGtfs.js <unzipped-gtfs-folder> [--prefix=XX-]');
    process.exit(1);
  }
  const prefix = (process.argv.find((a) => a.startsWith('--prefix=')) || '').slice(9);
  dotenv.config();
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/transport_tracking');
  await importGtfs(dir, { prefix });
  await mongoose.disconnect();
}
