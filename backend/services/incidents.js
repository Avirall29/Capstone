import Incident from '../models/Incident.js';
import { emitToAdmins } from './realtime.js';

const POPULATE = [
  { path: 'driver', select: 'name phone email' },
  { path: 'user', select: 'name phone email' },
  { path: 'bus', select: 'busNumber plateNumber' }
];

export const populateIncident = (query) => query.populate(POPULATE);

/** Create an incident and notify admins live. */
export async function createIncident(data) {
  const incident = await Incident.create(data);
  const full = await populateIncident(Incident.findById(incident._id));
  emitToAdmins('incident:new', full);
  return full;
}

/** Apply an update and notify admins. Returns null if not found. */
export async function updateIncident(id, update) {
  const incident = await populateIncident(Incident.findByIdAndUpdate(id, update, { new: true }));
  if (incident) emitToAdmins('incident:update', incident);
  return incident;
}

/** Auto-resolve open system incidents of a type for a trip (e.g. bus back on route). */
export async function autoResolve(tripId, type) {
  const open = await Incident.find({ trip: tripId, type, status: { $ne: 'resolved' } }).select('_id');
  for (const { _id } of open) {
    await updateIncident(_id, { status: 'resolved', resolution: 'auto', resolvedAt: new Date() });
  }
}

/** True if an unresolved incident of this type already exists for the trip. */
export const hasOpenIncident = (tripId, type) =>
  Incident.exists({ trip: tripId, type, status: { $ne: 'resolved' } });
