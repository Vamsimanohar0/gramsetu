const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

const DISALLOWED_PRODUCTION_DEFAULTS = new Set([
  'admin',
  'admin123',
  'password',
  '123456',
  'panchayath',
]);

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function verifyPassword(plainPassword, storedPassword, nodeEnv = env.nodeEnv) {
  if (!storedPassword || !plainPassword) {
    return { matched: false, needsRehash: false, blockedDefault: false };
  }

  const isProd = nodeEnv === 'production';

  if (isBcryptHash(storedPassword)) {
    // PHP password_hash() uses $2y$; bcryptjs expects $2a$ or $2b$.
    const normalizedHash = storedPassword.startsWith('$2y$')
      ? `$2a$${storedPassword.slice(4)}`
      : storedPassword;
    const matched = await bcrypt.compare(plainPassword, normalizedHash);
    if (matched && isProd && DISALLOWED_PRODUCTION_DEFAULTS.has(String(plainPassword).trim().toLowerCase())) {
      return { matched: false, needsRehash: false, blockedDefault: true };
    }
    return { matched, needsRehash: false, blockedDefault: false };
  }

  // Plaintext fallback is strictly disallowed in production.
  if (isProd) {
    return { matched: false, needsRehash: false, blockedDefault: true };
  }

  const matched = plainPassword === storedPassword;
  return { matched, needsRehash: matched, blockedDefault: false };
}

async function loginPanchayath(username, password) {
  const [rows] = await pool.execute(
    "SELECT id, name, username, password, email, phone, status FROM panchayaths WHERE username = ? AND status = 'active' LIMIT 1",
    [username]
  );

  if (rows.length === 0) {
    return null;
  }

  const panchayath = rows[0];
  const { matched, needsRehash, blockedDefault } = await verifyPassword(
    password,
    panchayath.password,
    env.nodeEnv
  );

  if (blockedDefault) {
    const err = new Error(
      'This account uses a default or unhashed password disabled in production. Please reset the password before logging in.'
    );
    err.statusCode = 403;
    throw err;
  }

  if (!matched) {
    return null;
  }

  // Upgrade legacy plaintext password to bcrypt transparently in non-production environments.
  if (needsRehash) {
    const hashed = await bcrypt.hash(password, 10);
    await pool.execute('UPDATE panchayaths SET password = ? WHERE id = ?', [hashed, panchayath.id]);
  }

  const payload = {
    id: panchayath.id,
    name: panchayath.name,
    username: panchayath.username,
    email: panchayath.email || '',
    role: 'panchayath_admin',
  };

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

  return {
    token,
    panchayath: payload,
  };
}

module.exports = {
  loginPanchayath,
  verifyPassword,
  isBcryptHash,
  DISALLOWED_PRODUCTION_DEFAULTS,
};
