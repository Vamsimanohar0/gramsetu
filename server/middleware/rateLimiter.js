/**
 * Lightweight in-memory fixed-window rate limiter keyed by client IP.
 */
function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 30,
  message = 'Too many requests. Please try again later.',
} = {}) {
  const hits = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  function middleware(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.max(0, resetSeconds)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, resetSeconds)));
      return res.status(429).json({
        status: 'error',
        message,
      });
    }

    return next();
  }

  middleware.reset = () => hits.clear();
  return middleware;
}

module.exports = {
  createRateLimiter,
};

