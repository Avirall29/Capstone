import express from 'express';
import { body } from 'express-validator';
import { authenticateAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import Driver from '../models/Driver.js';
import Bus from '../models/Bus.js';
import { readDocument } from '../services/storage.js';
import { sendPush } from '../services/push.js';
import { evictDriver } from '../services/liveTracker.js';
import { emitToAdmins } from '../services/realtime.js';

const router = express.Router();
router.use(authenticateAdmin);

const withBus = (query) => query.populate('assignedBus', 'busNumber plateNumber route');

// Get drivers (approved ones by default — applications have their own list)
router.get('/', async (req, res) => {
  const drivers = await withBus(Driver.find({ status: 'approved' }).sort({ createdAt: -1 }));
  res.json(drivers);
});

// ---------- Driver applications (self-registered drivers awaiting review) ----------

router.get('/applications', async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  // Admin-created drivers are "approved" too but never applied; only list self-registered ones.
  const filter = { status, 'documents.licenseFront': { $ne: null } };
  const applications = await Driver.find(filter)
    .sort(status === 'pending' ? { createdAt: 1 } : { reviewedAt: -1 })
    .limit(200)
    .populate('reviewedBy', 'username email');
  const counts = Object.fromEntries(await Promise.all(['pending', 'approved', 'rejected'].map(async (s) =>
    [s, await Driver.countDocuments({ status: s, 'documents.licenseFront': { $ne: null } })])));
  res.json({ applications, counts });
});

router.get('/:id/documents/:kind', async (req, res) => {
  if (!['licenseFront', 'licenseBack', 'idProof'].includes(req.params.kind)) {
    return res.status(400).json({ message: 'Unknown document' });
  }
  const driver = await Driver.findById(req.params.id).select('documents');
  const key = driver?.documents?.[req.params.kind];
  if (!key) return res.status(404).json({ message: 'Document not found' });
  try {
    const { buffer, mime } = await readDocument(key);
    res.set({ 'Content-Type': mime, 'Cache-Control': 'private, no-store' }).send(buffer);
  } catch {
    res.status(404).json({ message: 'Document not available' });
  }
});

async function review(req, res, status) {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ message: 'Application not found' });
  if (driver.status !== 'pending') {
    return res.status(400).json({ message: `Application was already ${driver.status}` });
  }
  driver.status = status;
  driver.reviewNote = req.body.reason || '';
  driver.reviewedBy = req.user._id;
  driver.reviewedAt = new Date();
  await driver.save();

  sendPush(driver.pushTokens, status === 'approved'
    ? { title: 'Application approved', body: 'You can now sign in to the driver app.', data: { type: 'application', status } }
    : { title: 'Application not approved', body: driver.reviewNote || 'Open the app for details.', data: { type: 'application', status } });
  emitToAdmins('application:update', { id: driver._id, status });
  res.json(driver);
}

router.post('/:id/approve', (req, res) => review(req, res, 'approved'));

router.post('/:id/reject', [
  body('reason').trim().isLength({ min: 3, max: 300 }).withMessage('Give the applicant a reason')
], validate, (req, res) => review(req, res, 'rejected'));

// ---------- Driver CRUD ----------

router.get('/:id', async (req, res) => {
  const driver = await withBus(Driver.findById(req.params.id));
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  res.json(driver);
});

// Admin-created drivers are approved immediately.
router.post('/', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('licenseNumber').notEmpty().trim(),
  body('password').isLength({ min: 6 })
], validate, async (req, res) => {
  const { name, email, phone, licenseNumber, password } = req.body;
  try {
    const driver = await Driver.create({ name, email, phone, licenseNumber, password, status: 'approved' });
    res.status(201).json(await withBus(Driver.findById(driver._id)));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or license number already exists' });
    }
    throw error;
  }
});

router.put('/:id', async (req, res) => {
  const { name, email, phone, licenseNumber, isActive } = req.body;
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });

  if (name) driver.name = name;
  if (email) driver.email = email;
  if (phone) driver.phone = phone;
  if (licenseNumber) driver.licenseNumber = licenseNumber;
  if (typeof isActive === 'boolean') driver.isActive = isActive;

  try {
    await driver.save();
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or license number already exists' });
    }
    throw error;
  }
  if (!driver.isActive) evictDriver(driver._id); // suspended: stop accepting cached pings
  res.json(await withBus(Driver.findById(driver._id)));
});

router.delete('/:id', async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  if (driver.assignedBus) {
    await Bus.findByIdAndUpdate(driver.assignedBus, { assignedDriver: null });
  }
  evictDriver(driver._id);
  await Driver.findByIdAndDelete(req.params.id);
  res.json({ message: 'Driver deleted successfully' });
});

export default router;
