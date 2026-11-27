const crypto = require('crypto');
const env = require('../config/env');
const { hashVoterKey } = require('./voterHash');

function getSigningSecret() {
  return env.voterHmacSecret || env.jwtSecret;
}

function signVoterId(voterId) {
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(`gramsetu-voter-cookie:${voterId}`)
    .digest('hex');
  return `${voterId}.${sig}`;
}

function verifySignedToken(rawCookieValue) {
  if (!rawCookieValue || typeof rawCookieValue !== 'string') {
    return null;
  }

  const dotIndex = rawCookieValue.indexOf('.');
  if (dotIndex <= 0) {
    return null;
  }

  const voterId = rawCookieValue.slice(0, dotIndex);
  const providedSig = rawCookieValue.slice(dotIndex + 1);
  if (!/^[a-f0-9]{32}$/.test(voterId) || !/^[a-f0-9]{64}$/.test(providedSig)) {
    return null;
  }

  const expectedToken = signVoterId(voterId);
  const expectedSig = expectedToken.slice(expectedToken.indexOf('.') + 1);

  const a = Buffer.from(providedSig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  return voterId;
}

function readSignedVoterCookie(req) {
  const raw = req?.cookies?.[env.voterCookieName];
  const voterId = verifySignedToken(raw);
  if (!voterId) {
    return null;
  }

  return {
    voterId,
    voterKeyHmac: hashVoterKey(voterId),
  };
}

function getOrIssueVoterCookie(req, res) {
  const existing = readSignedVoterCookie(req);
  if (existing) {
    return { ...existing, newlyIssued: false };
  }

  const voterId = crypto.randomBytes(16).toString('hex');
  const signedValue = signVoterId(voterId);
  res.cookie(env.voterCookieName, signedValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  return {
    voterId,
    voterKeyHmac: hashVoterKey(voterId),
    newlyIssued: true,
  };
}

module.exports = {
  readSignedVoterCookie,
  getOrIssueVoterCookie,
};

