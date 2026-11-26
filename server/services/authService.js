const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function verifyPassword(plainPassword, storedPassword) {
  if (!storedPassword || !plainPassword) {
    return { matched: false, needsRehash: false };
  }

  if (isBcryptHash(storedPassword)) {
    // PHP password_hash() uses $2y$; bcryptjs expects $2a$ or $2b$.
    const normalizedHash = storedPassword.startsWith('$2y$')
      ? `$2a$${storedPassword.slice(4)}`
      : storedPassword;
    const matched = await bcrypt.compare(plainPassword, normalizedHash);
    return { matched, needsRehash: false };
  }

  // Legacy plaintext compatibility for existing `vgmp` seed records.
  const matched = plainPassword === storedPassword;
  return { matched, needsRehash: matched };
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
  const { matched, needsRehash } = await verifyPassword(password, panchayath.password);
  if (!matched) {
    return null;
  }

  // Upgrade legacy plaintext password to bcrypt transparently on first successful login.
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
};

