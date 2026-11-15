import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import Bus from '../models/Bus.js';
import Driver from '../models/Driver.js';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import Incident from '../models/Incident.js';
import { getLiveBuses } from '../services/liveTracker.js';

const router = express.Router();
router.use(authenticateAdmin);

// Everything the dashboard header and sidebar badges need, in one request.
router.get('/summary', async (req, res) => {
  const [busStatus, drivers, pendingApplications, routes, stops, incidents] = await Promise.all([
    Bus.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Driver.countDocuments({ status: 'approved' }),
    Driver.countDocuments({ status: 'pending' }),
    Route.countDocuments(),
    Stop.countDocuments(),
    Incident.aggregate([{ $match: { status: { $ne: 'resolved' } } }, { $group: { _id: '$type', n: { $sum: 1 } } }])
  ]);
  const buses = Object.fromEntries(busStatus.map((b) => [b._id, b.n]));
  const openIncidents = Object.fromEntries(incidents.map((i) => [i._id, i.n]));
  const live = getLiveBuses();
  res.json({
    buses: { total: Object.values(buses).reduce((a, b) => a + b, 0), ...buses },
    drivers,
    pendingApplications,
    routes,
    stops,
    activeTrips: live.length,
    delayedBuses: live.filter((b) => b.delayMinutes > 5).length,
    offRouteBuses: live.filter((b) => b.offRoute).length,
    openIncidents: { total: Object.values(openIncidents).reduce((a, b) => a + b, 0), ...openIncidents }
  });
});

export default router;
