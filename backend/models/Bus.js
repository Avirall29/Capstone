import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true, trim: true },
  plateNumber: { type: String, required: true, unique: true, trim: true },
  capacity: { type: Number, required: true, min: 1 },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'breakdown'],
    default: 'inactive'
  },
  // Last persisted position. Live positions come from services/liveTracker.js (in memory);
  // this copy is refreshed every ~30 s so a server restart can recover.
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    timestamp: { type: Date, default: null }
  }
}, {
  timestamps: true
});

const Bus = mongoose.model('Bus', busSchema);

export default Bus;
