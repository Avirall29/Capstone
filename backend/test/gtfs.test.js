import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { importGtfs, parseCsvLine } from '../scripts/importGtfs.js';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';

test('csv: quoted fields with commas and escaped quotes', () => {
  assert.deepEqual(parseCsvLine('a,"b, c","say ""hi""",'), ['a', 'b, c', 'say "hi"', '']);
});

test('imports a small GTFS feed: stop pattern, offsets, departures, shape', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtfs-'));
  const write = (name, lines) => fs.writeFileSync(path.join(dir, name), lines.join('\n'));
  write('routes.txt', ['route_id,route_short_name,route_long_name,route_color', 'R1,15,"Sector 1, Main Road",FF0000']);
  write('trips.txt', ['route_id,service_id,trip_id,direction_id,shape_id', 'R1,S,T1,0,SH1', 'R1,S,T2,0,SH1', 'R1,S,T3,1,SH2']);
  write('stops.txt', ['stop_id,stop_name,stop_lat,stop_lon', 'A,Alpha,30.70,76.70', 'B,Beta,30.71,76.71', 'C,"Gamma, Gate 2",30.72,76.72']);
  write('stop_times.txt', [
    'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
    'T1,08:00:00,08:00:00,A,1', 'T1,08:07:00,08:07:00,B,2', 'T1,08:15:00,08:15:00,C,3',
    'T2,24:30:00,24:30:00,A,1', 'T2,24:37:00,24:37:00,B,2',
    'T3,09:00:00,09:00:00,C,1', 'T3,09:10:00,09:10:00,A,2'
  ]);
  write('shapes.txt', ['shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence', 'SH1,30.70,76.70,1', 'SH1,30.705,76.706,2', 'SH1,30.72,76.72,3']);

  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('gtfs'));
  try {
    const result = await importGtfs(dir, { prefix: 'T-', log: () => {} });
    assert.deepEqual(result, { stops: 3, routes: 1 });
    const route = await Route.findOne({ number: 'T-15' }).populate('stops.stop');
    assert.equal(route.name, 'Sector 1, Main Road');
    assert.equal(route.color, '#FF0000');
    assert.deepEqual(route.stops.map((s) => [s.stop.name, s.offsetMinutes]), [['Alpha', 0], ['Beta', 7], ['Gamma, Gate 2', 15]]);
    assert.deepEqual(route.departures, ['00:30', '08:00'], 'after-midnight GTFS times wrap');
    assert.equal(route.path.coordinates.length, 3);
    assert.equal(await Stop.countDocuments({ code: /^T-/ }), 3);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
