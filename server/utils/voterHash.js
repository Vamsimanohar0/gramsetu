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

function getHmacSecret() {
  return env.voterHmacSecret || env.jwtSecret;
}

function hashVoterKey(voterKey) {
  const cleaned = String(voterKey ?? '').trim();
  if (!cleaned) {
    const err = new Error('Voter session key is required.');
    err.statusCode = 400;
    throw err;
  }

  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(`gramsetu-voter-key:${cleaned}`)
    .digest('hex');
}

module.exports = {
  normalizeMobileNumber,
  isValidIndianMobile,
  hashVoterKey,
};
