import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runMigrations } from '../migrations.js';
import Route from '../models/Route.js';
import Driver from '../models/Driver.js';

test('migrates legacy string routes and drivers without status (idempotent)', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('legacy'));
  try {
    const db = mongoose.connection.db;
    await db.collection('buses').insertMany([
      { busNumber: 'L1', plateNumber: 'P1', capacity: 40, route: 'Old Route', routeCoordinates: [{ lat: 30.7, lng: 76.7 }, { lat: 30.71, lng: 76.71 }] },
      { busNumber: 'L2', plateNumber: 'P2', capacity: 40, route: 'Old Route', routeCoordinates: [] }
    ]);
    await db.collection('drivers').insertOne({ name: 'Old', email: 'old@x.com', phone: '1', licenseNumber: 'OLD1', password: 'x', isActive: true });

    await runMigrations();
    await runMigrations(); // second run is a no-op

    const routes = await Route.find();
    assert.equal(routes.length, 1);
    assert.equal(routes[0].number, 'Old Route');
    assert.deepEqual(routes[0].path.coordinates, [[76.7, 30.7], [76.71, 30.71]]);
    const buses = await db.collection('buses').find().toArray();
    assert.ok(buses.every((b) => String(b.route) === String(routes[0]._id) && b.routeCoordinates === undefined));
    assert.equal((await Driver.findOne({ email: 'old@x.com' })).status, 'approved');
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
