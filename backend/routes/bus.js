import express from 'express';
import { body } from 'express-validator';
import { authenticateAdmin } from '../middleware/auth.js';
import { validate, isObjectId } from '../middleware/validate.js';
import Bus from '../models/Bus.js';
import Driver from '../models/Driver.js';
import Route from '../models/Route.js';
import { getLiveBus } from '../services/liveTracker.js';

const router = express.Router();
router.use(authenticateAdmin);

const populate = (query) => query
  .populate('assignedDriver', 'name email phone')
  .populate('route', 'number name color');

const withLive = (bus) => ({ ...bus.toJSON(), live: getLiveBus(bus._id) });

const routeExists = async (value) => {
  if (value === null || value === '') return true;
  if (!isObjectId(value) || !(await Route.exists({ _id: value }))) throw new Error('Route not found');
  return true;
};

router.get('/', async (req, res) => {
  const buses = await populate(Bus.find().sort({ createdAt: -1 }));
  res.json(buses.map(withLive));
});

// Active buses with live position (for the admin map)
router.get('/active/all', async (req, res) => {
  const buses = await populate(Bus.find({ status: { $in: ['active', 'breakdown'] } }));
  res.json(buses.map(withLive));
});

router.get('/:id', async (req, res) => {
  const bus = await populate(Bus.findById(req.params.id));
  if (!bus) return res.status(404).json({ message: 'Bus not found' });
  res.json(withLive(bus));
});

router.post('/', [
  body('busNumber').notEmpty().trim(),
  body('plateNumber').notEmpty().trim(),
  body('capacity').isInt({ min: 1 }),
  body('route').optional({ values: 'null' }).custom(routeExists)
], validate, async (req, res) => {
  const { busNumber, plateNumber, capacity, route } = req.body;
  try {
    const bus = await Bus.create({ busNumber, plateNumber, capacity, route: route || null });
    res.status(201).json(await populate(Bus.findById(bus._id)));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bus number or plate number already exists' });
    }
    throw error;
  }
});

router.put('/:id', [
  body('route').optional({ values: 'null' }).custom(routeExists),
  body('status').optional().isIn(['active', 'inactive', 'maintenance', 'breakdown'])
], validate, async (req, res) => {
  const { busNumber, plateNumber, capacity, route, status } = req.body;
  const bus = await Bus.findById(req.params.id);
  if (!bus) return res.status(404).json({ message: 'Bus not found' });

  if (busNumber) bus.busNumber = busNumber;
  if (plateNumber) bus.plateNumber = plateNumber;
  if (capacity) bus.capacity = capacity;
  if (route !== undefined) bus.route = route || null;
  if (status) bus.status = status;

  try {
    await bus.save();
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bus number or plate number already exists' });
    }
    throw error;
  }
  res.json(await populate(Bus.findById(bus._id)));
});

router.delete('/:id', async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) return res.status(404).json({ message: 'Bus not found' });
  if (bus.assignedDriver) {
    await Driver.findByIdAndUpdate(bus.assignedDriver, { assignedBus: null });
  }
  await Bus.findByIdAndDelete(req.params.id);
  res.json({ message: 'Bus deleted successfully' });
});

router.post('/:id/assign-driver', [body('driverId').custom(isObjectId)], validate, async (req, res) => {
  const { driverId } = req.body;
  const bus = await Bus.findById(req.params.id);
  if (!bus) return res.status(404).json({ message: 'Bus not found' });

  const driver = await Driver.findById(driverId);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  if (driver.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved drivers can be assigned to a bus' });
  }

  if (driver.assignedBus && driver.assignedBus.toString() !== req.params.id) {
    await Bus.findByIdAndUpdate(driver.assignedBus, { assignedDriver: null });
  }
  if (bus.assignedDriver && bus.assignedDriver.toString() !== driverId) {
    await Driver.findByIdAndUpdate(bus.assignedDriver, { assignedBus: null });
  }

  bus.assignedDriver = driverId;
  driver.assignedBus = req.params.id;
  await bus.save();
  await driver.save();

  res.json(await populate(Bus.findById(req.params.id)));
});

export default router;
