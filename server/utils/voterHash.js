const crypto = require('crypto');
const env = require('../config/env');

const TEN_DIGIT_MOBILE_REGEX = /^[0-9]{10}$/;

function normalizeMobileNumber(rawMobile) {
  const digitsOnly = String(rawMobile ?? '').replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.slice(1);
  }
  return digitsOnly;
}

function isValidIndianMobile(rawMobile) {
  return TEN_DIGIT_MOBILE_REGEX.test(normalizeMobileNumber(rawMobile));
}

function hashVoterMobile(rawMobile) {
  if (!env.voterHmacSecret) {
    const err = new Error('VOTER_HMAC_SECRET is not configured for voter identity hashing.');
    err.statusCode = 503;
    err.code = 'VOTER_SECRET_UNCONFIGURED';
    throw err;
  }

  const normalized = normalizeMobileNumber(rawMobile);
  if (!TEN_DIGIT_MOBILE_REGEX.test(normalized)) {
    const err = new Error('Please enter a valid 10-digit mobile number.');
    err.statusCode = 400;
    throw err;
  }

  return crypto
    .createHmac('sha256', env.voterHmacSecret)
    .update(`gramsetu-voter:${normalized}`)
    .digest('hex');
}

module.exports = {
  normalizeMobileNumber,
  isValidIndianMobile,
  hashVoterMobile,
};

