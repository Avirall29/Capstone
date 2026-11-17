// Idempotent data migrations, run on every startup (cheap when there is nothing to do).
import mongoose from 'mongoose';
import Driver from './models/Driver.js';
import Route from './models/Route.js';

export async function runMigrations() {
  // 1. Drivers created before self-registration existed are approved.
  await Driver.updateMany({ status: { $exists: false } }, { $set: { status: 'approved' } });

  // 2. Bus.route used to be a free-text string with per-bus routeCoordinates.
  //    Create a Route per distinct name and point buses at it.
  const buses = mongoose.connection.collection('buses');
  for (const bus of await buses.find({ route: { $type: 'string' } }).toArray()) {
    const number = bus.route.trim() || 'Unassigned';
    let route = await Route.findOne({ number });
    if (!route) {
      const coords = (bus.routeCoordinates || [])
        .filter((c) => typeof c?.lat === 'number' && typeof c?.lng === 'number')
        .map((c) => [c.lng, c.lat]);
      route = await Route.create({
        number,
        name: number,
        path: { type: 'LineString', coordinates: coords.length >= 2 ? coords : [] },
        pathSource: coords.length >= 2 ? 'manual' : 'straight'
      });
    }
    await buses.updateOne({ _id: bus._id }, { $set: { route: route._id } });
  }
  await buses.updateMany({ routeCoordinates: { $exists: true } }, { $unset: { routeCoordinates: '' } });
}
