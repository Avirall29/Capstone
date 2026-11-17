import mongoose from 'mongoose';

// GPS history, stored as a MongoDB time-series collection (compressed) and expired after 14 days.
// Live positions are NOT read from here; they live in memory in services/liveTracker.js.
// Pings are sampled (every 30 s or 100 m) and written in batches.
const HISTORY_TTL_SECONDS = 14 * 24 * 60 * 60;

const locationSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  meta: {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }
  },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 }
}, {
  timeseries: { timeField: 'timestamp', metaField: 'meta', granularity: 'seconds' },
  expireAfterSeconds: HISTORY_TTL_SECONDS,
  versionKey: false,
  collection: 'locationhistory' // the old 'locations' collection was a regular collection
});

const Location = mongoose.model('Location', locationSchema);
export default Location;
