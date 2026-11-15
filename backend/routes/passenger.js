import express from 'express';
import { body } from 'express-validator';
import User from '../models/User.js';
import Route from '../models/Route.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate, isObjectId } from '../middleware/validate.js';
import { isExpoPushToken } from '../services/push.js';
import { addArrivalWatch, removeArrivalWatch } from '../services/liveTracker.js';

const router = express.Router();
router.use(authenticateUser);

router.post('/push-token', [body('token').custom(isExpoPushToken)], validate, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $addToSet: { pushTokens: req.body.token } });
  res.json({ message: 'Saved' });
});

// "Notify me when my bus is N stops away" (push + in-app socket event)
router.post('/arrival-alerts', [
  body('routeId').custom(isObjectId),
  body('stopId').custom(isObjectId),
  body('stopsBefore').optional().isInt({ min: 0, max: 5 })
], validate, async (req, res) => {
  const { routeId, stopId, stopsBefore = 2 } = req.body;
  if (!await Route.exists({ _id: routeId, 'stops.stop': stopId })) {
    return res.status(400).json({ message: 'That stop is not on this route' });
  }
  addArrivalWatch({ userId: req.user._id, routeId, stopId, stopsBefore: Number(stopsBefore) });
  res.status(201).json({ message: 'We will notify you when the bus is close' });
});

router.delete('/arrival-alerts/:stopId', (req, res) => {
  removeArrivalWatch(req.user._id, req.params.stopId);
  res.json({ message: 'Alert removed' });
});

export default router;
