const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && req.cookies[env.cookieName]) {
    return req.cookies[env.cookieName];
  }
  return null;
}

async function requirePanchayathAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch {
      return res.status(401).json({
        status: 'error',
        message: 'Session expired or invalid. Please log in again.',
      });
    }

    if (!decoded || decoded.role !== 'panchayath_admin' || !decoded.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied.',
      });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, username, email, status FROM panchayaths WHERE id = ? AND status = 'active' LIMIT 1",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Panchayath account is inactive or not found.',
      });
    }

    req.panchayath = rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requirePanchayathAuth,
  extractToken,
};

