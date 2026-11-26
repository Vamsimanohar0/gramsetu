const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const env = require('../config/env');
const { pool } = require('../config/db');

/**
 * Production-ready shared rate-limit store backed by the MySQL `rate_limits` table.
 * Falls back cleanly to an isolated in-memory bucket store in test mode or if
 * the `rate_limits` migration table has not been applied yet.
 */
class MySQLRateLimitStore {
  constructor({ prefix = 'rl:', useMemoryOnly = env.nodeEnv === 'test' } = {}) {
    this.prefix = prefix;
    this.windowMs = 15 * 60 * 1000;
    this.useMemoryOnly = useMemoryOnly;
    this.memoryBuckets = new Map();
    this.warnedMissingTable = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  fullKey(key) {
    return `${this.prefix}${String(key)}`.slice(0, 191);
  }

  incrementMemory(key) {
    const k = this.fullKey(key);
    const now = Date.now();
    let entry = this.memoryBuckets.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { hits: 0, resetAt: now + this.windowMs };
      this.memoryBuckets.set(k, entry);
    }
    entry.hits += 1;
    return {
      totalHits: entry.hits,
      resetTime: new Date(entry.resetAt),
    };
  }

  async increment(key) {
    if (this.useMemoryOnly) {
      return this.incrementMemory(key);
    }

    const dbKey = this.fullKey(key);
    try {
      await pool.execute(
        `INSERT INTO rate_limits (rate_key, hits, reset_at)
         VALUES (?, 1, DATE_ADD(NOW(3), INTERVAL ? MILLISECOND))
         ON DUPLICATE KEY UPDATE
           hits = IF(reset_at <= NOW(3), 1, hits + 1),
           reset_at = IF(reset_at <= NOW(3), DATE_ADD(NOW(3), INTERVAL ? MILLISECOND), reset_at)`,
        [dbKey, this.windowMs, this.windowMs]
      );

      const [rows] = await pool.execute(
        'SELECT hits, reset_at FROM rate_limits WHERE rate_key = ? LIMIT 1',
        [dbKey]
      );

      if (rows.length > 0) {
        const totalHits = Number(rows[0].hits);
        const resetTime = rows[0].reset_at ? new Date(rows[0].reset_at) : null;
        if (Number.isInteger(totalHits) && totalHits > 0 && resetTime && !Number.isNaN(resetTime.getTime())) {
          return { totalHits, resetTime };
        }
      }
    } catch (err) {
      if (!this.warnedMissingTable) {
        this.warnedMissingTable = true;
        console.warn(
          `[RateLimiter] MySQL store unavailable (${err.code || err.message}); using local fallback.`
        );
      }
    }

    return this.incrementMemory(key);
  }

  async decrement(key) {
    if (this.useMemoryOnly) {
      const k = this.fullKey(key);
      const entry = this.memoryBuckets.get(k);
      if (entry && entry.hits > 0) entry.hits -= 1;
      return;
    }

    const dbKey = this.fullKey(key);
    try {
      await pool.execute(
        'UPDATE rate_limits SET hits = GREATEST(0, hits - 1) WHERE rate_key = ?',
        [dbKey]
      );
    } catch {
      // Ignore fallback decrement errors.
    }
  }

  async resetKey(key) {
    const k = this.fullKey(key);
    this.memoryBuckets.delete(k);
    if (!this.useMemoryOnly) {
      await pool.execute('DELETE FROM rate_limits WHERE rate_key = ?', [k]).catch(() => {});
    }
  }

  async resetAll() {
    this.memoryBuckets.clear();
    if (!this.useMemoryOnly) {
      await pool
        .execute('DELETE FROM rate_limits WHERE rate_key LIKE ?', [`${this.prefix}%`])
        .catch(() => {});
    }
  }
}

function createSharedRateLimiter({
  prefix = 'rl:',
  windowMs = 15 * 60 * 1000,
  max = 30,
  message = 'Too many requests. Please try again later.',
  keyGenerator,
} = {}) {
  const store = new MySQLRateLimitStore({ prefix });
  const limiter = rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    keyGenerator: keyGenerator || ((req) => ipKeyGenerator(req.ip || '127.0.0.1')),
    handler: (_req, res) => {
      res.status(429).json({
        status: 'error',
        message,
      });
    },
  });

  limiter.reset = () => store.resetAll();
  limiter.store = store;
  return limiter;
}

module.exports = {
  MySQLRateLimitStore,
  createSharedRateLimiter,
  ipKeyGenerator,
};
