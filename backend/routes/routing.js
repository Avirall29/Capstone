import express from 'express';
import { body } from 'express-validator';
import { authenticateDriver } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getDirections } from '../services/routing.js';

const router = express.Router();

// Re-routing happens only when a driver leaves the path, so this stays far below free API quotas.
const directionsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  key: (req) => String(req.user?._id || req.ip),
  message: 'Re-routing limit reached. Follow the planned route for now.'
});

// Driver navigation: road directions from the current position through the next stops.
router.post('/directions', authenticateDriver, directionsLimiter, [
  body('points').isArray({ min: 2, max: 25 }),
  body('points.*.lat').isFloat({ min: -90, max: 90 }),
  body('points.*.lng').isFloat({ min: -180, max: 180 })
], validate, async (req, res) => {
  const points = req.body.points.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
  res.json(await getDirections(points));
});

export default router;
