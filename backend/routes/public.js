import express from 'express';
import { query } from 'express-validator';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as liveTracker from '../services/liveTracker.js';
import { plan, nearestServedStops } from '../services/journeyPlanner.js';
import { searchPlaces } from '../services/routing.js';

const router = express.Router();

const latLng = (lat = 'lat', lng = 'lng') => [
  query(lat).isFloat({ min: -90, max: 90 }),
  query(lng).isFloat({ min: -180, max: 180 })
];

const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

// All routes (for filters / browsing)
router.get('/routes', async (req, res) => {
  const routes = await Route.find().select('number name color stops').sort({ number: 1 }).lean();
  res.json(routes.map((r) => ({ _id: r._id, number: r.number, name: r.name, color: r.color, stopsCount: r.stops.length })));
});

// One route with ordered stops and road path
router.get('/routes/:id', async (req, res) => {
  const route = await liveTracker.getRoute(req.params.id);
  if (!route) return res.status(404).json({ message: 'Route not found' });
  res.json({
    _id: route.id, number: route.number, name: route.name, color: route.color, departures: route.departures,
    stops: route.stops.map(({ id, name, lat, lng, offsetMinutes }) => ({ id, name, lat, lng, offsetMinutes })),
    path: route.index ? route.index.points.map((p) => [p.lng, p.lat]) : [],
    buses: liveTracker.getLiveBuses(route.id)
  });
});

// Live buses, optionally for one route
router.get('/buses/active', (req, res) => {
  res.json(liveTracker.getLiveBuses(req.query.route || null));
});

router.get('/buses/:id', (req, res) => {
  const bus = liveTracker.getLiveBus(req.params.id);
  if (!bus) return res.status(404).json({ message: 'Bus is not on a trip right now' });
  res.json(bus);
});

// Nearest stops served by a route, with the routes that stop there
router.get('/stops/nearest', latLng(), validate, async (req, res) => {
  const limit = Math.min(10, parseInt(req.query.limit) || 3);
  res.json(await nearestServedStops({ lat: Number(req.query.lat), lng: Number(req.query.lng) }, limit));
});

// Live arrivals at a stop
router.get('/stops/:id/arrivals', async (req, res) => {
  const stop = await Stop.findById(req.params.id);
  if (!stop) return res.status(404).json({ message: 'Stop not found' });
  res.json({ stop, arrivals: liveTracker.getArrivals(stop._id) });
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "Where to?" autocomplete: our stops first (instant, free), then places from Photon.
router.get('/search', searchLimiter, [
  query('q').trim().isLength({ min: 2, max: 100 }),
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat()
], validate, async (req, res) => {
  const q = String(req.query.q).trim();
  const near = req.query.lat != null && req.query.lng != null ? { lat: Number(req.query.lat), lng: Number(req.query.lng) } : null;
  const [stops, places] = await Promise.all([
    Stop.find({ name: { $regex: escapeRegex(q), $options: 'i' } }).limit(6).lean(),
    req.query.stopsOnly === 'true' ? [] : searchPlaces(q, near)
  ]);
  res.json({
    stops: stops.map((s) => ({
      type: 'stop', id: s._id, name: s.name, label: s.name,
      lat: s.location.coordinates[1], lng: s.location.coordinates[0]
    })),
    places
  });
});

// Journey options from A to B (Dijkstra over the stop network, live-aware)
router.get('/journey', searchLimiter, [...latLng('fromLat', 'fromLng'), ...latLng('toLat', 'toLng')], validate, async (req, res) => {
  const from = { lat: Number(req.query.fromLat), lng: Number(req.query.fromLng) };
  const to = { lat: Number(req.query.toLat), lng: Number(req.query.toLng) };
  const [options, nearest] = await Promise.all([plan({ from, to }), nearestServedStops(from, 1)]);
  res.json({ nearestStop: nearest[0] || null, options });
});

export default router;
