import mongoose from 'mongoose';

// A transit route: ordered stops + the road path between them + scheduled departures.
const routeSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true, trim: true },
  name: { type: String, trim: true, default: '' },
  color: { type: String, default: '#0F766E' },
  stops: [{
    _id: false,
    stop: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
    offsetMinutes: { type: Number, default: 0 } // scheduled minutes from route start
  }],
  // Road geometry through all stops (GeoJSON LineString coordinates, [lng, lat]).
  path: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: { type: [[Number]], default: [] }
  },
  pathSource: { type: String, enum: ['routing', 'straight', 'manual'], default: 'straight' },
  departures: [{ type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ }] // "HH:MM", local time
}, { timestamps: true });

const Route = mongoose.model('Route', routeSchema);
export default Route;
