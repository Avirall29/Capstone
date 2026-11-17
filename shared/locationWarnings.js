// Location-off warning rules for drivers during an active trip (pure, clock-injected, unit-tested).
//
// - Location off for 15 s continuously  -> warning (count + 1). The 15 s window then restarts.
// - Turning location back on does NOT reset the count; it only stops the current off-window.
// - Once 2 warnings have been given, every further full 15 s off-window escalates to the admin
//   instead of adding a warning. (Driver keeps being reminded on each escalation.)
//
// Usage: let state = initialWarningState(prev?.count);
//        const { state: next, event } = stepWarnings(state, { locationOn, now });
//        event: null | { type: 'warning', count } | { type: 'escalate', count }

export const WARNING_DELAY_MS = 15000;
export const WARNINGS_BEFORE_ADMIN = 2;

export function initialWarningState(count = 0) {
  return { count, offSince: null };
}

export function stepWarnings(state, { locationOn, now }) {
  if (locationOn) {
    return { state: { ...state, offSince: null }, event: null };
  }
  if (state.offSince === null) {
    return { state: { ...state, offSince: now }, event: null };
  }
  if (now - state.offSince < WARNING_DELAY_MS) {
    return { state, event: null };
  }
  // A full off-window elapsed: restart the window from now.
  if (state.count < WARNINGS_BEFORE_ADMIN) {
    const count = state.count + 1;
    return { state: { count, offSince: now }, event: { type: 'warning', count } };
  }
  return { state: { ...state, offSince: now }, event: { type: 'escalate', count: state.count } };
}
