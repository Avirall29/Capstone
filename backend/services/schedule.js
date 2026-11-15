// Turns route departure strings ("HH:MM", local transit time) into real Dates.
// The server may run in UTC (Render), so the transit timezone is explicit.
const TZ = () => process.env.TRANSIT_TIMEZONE || 'Asia/Kolkata';

// Offset (ms) of the timezone from UTC at a given instant.
function tzOffsetMs(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

/** Departure Dates for yesterday, today and tomorrow (local transit days), sorted. */
export function departureDates(departures = [], now = new Date(), timeZone = TZ()) {
  const offset = tzOffsetMs(now, timeZone);
  const local = new Date(now.getTime() + offset);
  const dates = [];
  for (const dayShift of [-1, 0, 1]) {
    for (const hhmm of departures) {
      const [h, m] = hhmm.split(':').map(Number);
      const utc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dayShift, h, m) - offset;
      dates.push(new Date(utc));
    }
  }
  return dates.sort((a, b) => a - b);
}

/** The scheduled departure nearest to a trip start, if within 90 minutes. */
export function matchScheduledDeparture(departures, startTime = new Date()) {
  let best = null;
  for (const d of departureDates(departures, startTime)) {
    const diff = Math.abs(d - startTime);
    if (diff <= 90 * 60000 && (!best || diff < Math.abs(best - startTime))) best = d;
  }
  return best;
}

/** Earliest scheduled arrival at a stop (departure + offset) at or after `after`, or null. */
export function nextScheduledArrival(departures, offsetMinutes, after = new Date()) {
  for (const d of departureDates(departures, after)) {
    const arrival = new Date(d.getTime() + offsetMinutes * 60000);
    if (arrival >= after) return arrival;
  }
  return null;
}
