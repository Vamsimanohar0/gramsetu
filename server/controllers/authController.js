const env = require('../config/env');
const authService = require('../services/authService');
const complaintService = require('../services/complaintService');
const { validateLogin } = require('../validators/complaintValidator');

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  };
}

async function login(req, res, next) {
  try {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const result = await authService.loginPanchayath(
      validation.data.username,
      validation.data.password
    );

    if (!result) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password',
      });
    }

    res.cookie(env.cookieName, result.token, getCookieOptions());
    return res.json({
      status: 'success',
      panchayath: result.panchayath,
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(_req, res) {
  const { maxAge: _unused, ...clearOptions } = getCookieOptions();
  res.clearCookie(env.cookieName, clearOptions);
  return res.json({
    status: 'success',
    message: 'Logged out successfully',
  });
}

async function me(req, res, next) {
  try {
    const villages = await complaintService.getPanchayathVillages(req.panchayath.id);
    return res.json({
      status: 'success',
      panchayath: req.panchayath,
      villages,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  me,
};

