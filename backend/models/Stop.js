import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Optional translated names, e.g. { hi: 'सेक्टर 17', pa: 'ਸੈਕਟਰ 17' }
  names: { type: Map, of: String, default: {} },
  code: { type: String, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  }
}, { timestamps: true });

stopSchema.index({ location: '2dsphere' });
stopSchema.index({ name: 'text' });

stopSchema.virtual('lat').get(function () { return this.location?.coordinates?.[1]; });
stopSchema.virtual('lng').get(function () { return this.location?.coordinates?.[0]; });
stopSchema.set('toJSON', { virtuals: true });

const Stop = mongoose.model('Stop', stopSchema);
export default Stop;
