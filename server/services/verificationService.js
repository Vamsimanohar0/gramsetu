const env = require('../config/env');

/**
 * MobileVerificationProvider interface:
 * Implementers must expose:
 *   - methodName: string (e.g. 'sms_otp')
 *   - isConfigured(): boolean
 *   - startVerification({ complaintId, mobile }): Promise<{ challengeId, expiresInSeconds, ... }>
 *   - verifyAction({ complaintId, mobile, verificationToken }): Promise<{ verified: boolean, normalizedMobile: string, method: string }>
 */

const registeredProviders = new Map();
let testProviderOverride = null;

function registerVerificationProvider(mode, provider) {
  if (!mode || !provider) return;
  registeredProviders.set(String(mode).toLowerCase(), provider);
}

function setVerificationProviderForTests(provider) {
  if (env.nodeEnv !== 'test') {
    throw new Error('Test verification provider can only be configured in test environment.');
  }
  testProviderOverride = provider || null;
}

function getActiveVerificationProvider() {
  if (env.nodeEnv === 'test' && testProviderOverride) {
    return testProviderOverride;
  }
  const mode = env.votingVerificationMode;
  if (!mode || mode === 'disabled') {
    return null;
  }
  const provider = registeredProviders.get(mode);
  if (!provider || (typeof provider.isConfigured === 'function' && !provider.isConfigured())) {
    return null;
  }
  return provider;
}

function getVotingAvailability() {
  const provider = getActiveVerificationProvider();
  if (!provider) {
    return {
      enabled: false,
      mode: env.votingVerificationMode || 'disabled',
      code: 'VERIFICATION_PROVIDER_UNCONFIGURED',
      message:
        'Community voting requires verified mobile identity. Mobile OTP verification is not configured in this release.',
    };
  }

  return {
    enabled: true,
    mode: provider.methodName || env.votingVerificationMode,
    code: 'VERIFICATION_READY',
    message: 'Verified mobile voting is enabled.',
  };
}

function requireActiveVerificationProvider() {
  const provider = getActiveVerificationProvider();
  if (!provider) {
    const availability = getVotingAvailability();
    const err = new Error(availability.message);
    err.statusCode = 503;
    err.code = availability.code;
    throw err;
  }
  return provider;
}

module.exports = {
  registerVerificationProvider,
  setVerificationProviderForTests,
  getActiveVerificationProvider,
  getVotingAvailability,
  requireActiveVerificationProvider,
};

