import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Driver from '../models/Driver.js';
import User from '../models/User.js';

const bearer = (req) => req.header('Authorization')?.replace('Bearer ', '');

export const signToken = (userId, role, expiresIn = '7d') =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn });

/** Returns { userId, role } for a valid token, otherwise null. */
export const verifyToken = (token) => {
  if (!token) return null;
  try {
    const { userId, role } = jwt.verify(token, process.env.JWT_SECRET);
    return { userId, role };
  } catch {
    return null;
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = bearer(req);
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.userId).select('-password');

    if (!admin || admin.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = admin;
    req.userType = 'admin';
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/** A driver is usable only when approved by an admin and not suspended. */
export const isDriverAllowed = (driver) => Boolean(driver && driver.isActive && driver.status === 'approved');

export const authenticateDriver = async (req, res, next) => {
  try {
    const token = bearer(req);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'driver') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const driver = await Driver.findById(decoded.userId).select('-password');

    if (!isDriverAllowed(driver)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = driver;
    req.userType = 'driver';
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authenticateUser = async (req, res, next) => {
  try {
    const token = bearer(req);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || user.role !== 'user' || !user.isActive) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    req.userType = 'user';
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * For endpoints usable with or without login (e.g. passenger panic).
 * Sets req.auth = { userId, role } when a valid token is present; never rejects.
 */
export const optionalAuth = (req, res, next) => {
  req.auth = verifyToken(bearer(req));
  next();
};
