// Create an admin, or reset an existing admin's password.
// Usage: node create-admin.js <email> <password>
// Uses MONGODB_URI from .env (point it at the production DB to manage the deployed admin).
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: node create-admin.js <email> <password>   (password: min 8 characters)');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/transport_tracking');

const existing = await Admin.findOne({ email: email.toLowerCase() });
if (existing) {
  existing.password = password; // re-hashed by the pre-save hook
  await existing.save();
  console.log(`Password reset for admin ${existing.email}`);
} else {
  const admin = await Admin.create({ username: email.toLowerCase(), email, password });
  console.log(`Admin created: ${admin.email}`);
}

await mongoose.disconnect();
