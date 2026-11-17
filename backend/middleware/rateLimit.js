// Fixed-window rate limiter.
// ponytail: in-memory, per server instance; move to a Redis store if we ever run more than one instance.
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();

  return (req, res, next) => {
    const k = key(req);
    const count = (hits.get(k) || 0) + 1;
    hits.set(k, count);
    if (count > max) {
      return res.status(429).json({ message });
    }
    next();
  };
}

// Login brute-force guard: 10 attempts per IP+email per 15 minutes.
// Keyed on IP+email (not IP alone) so many users behind one mobile-carrier NAT don't block each other.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many login attempts. Try again in 15 minutes.'
});
