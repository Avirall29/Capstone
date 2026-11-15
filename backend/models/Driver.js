import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  licenseNumber: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
  isActive: { type: Boolean, default: true }, // admin suspension switch

  // Self-registration / approval. Admin-created drivers are approved immediately.
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
  address: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  licenseClass: { type: String, trim: true, default: '' },
  licenseExpiry: { type: Date, default: null },
  experienceYears: { type: Number, min: 0, max: 60, default: null },
  emergencyContact: {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' }
  },
  idType: { type: String, trim: true, default: '' }, // e.g. "Voter ID", "Masked Aadhaar"
  // Storage keys (see services/storage.js) — never public URLs.
  documents: {
    licenseFront: { type: String, default: null },
    licenseBack: { type: String, default: null },
    idProof: { type: String, default: null }
  },
  reviewNote: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  reviewedAt: { type: Date, default: null },
  pushTokens: { type: [String], default: [] }
}, {
  timestamps: true
});

driverSchema.index({ status: 1, createdAt: -1 });

driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

driverSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Never serialize secrets or storage keys.
driverSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.pushTokens;
    if (ret.documents) {
      ret.documents = Object.fromEntries(Object.entries(ret.documents).map(([k, v]) => [k, Boolean(v)]));
    }
    return ret;
  }
});

const Driver = mongoose.model('Driver', driverSchema);

export default Driver;
