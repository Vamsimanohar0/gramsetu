const jwt = require('jsonwebtoken');
const env = require('../config/env');

const EVIDENCE_TTL = '15m';

function signCitizenEvidenceToken(complaintId, filename) {
  return jwt.sign(
    {
      scope: 'citizen_evidence',
      complaint_id: String(complaintId),
      filename: String(filename),
    },
    env.jwtSecret,
    { expiresIn: EVIDENCE_TTL }
  );
}

function verifyCitizenEvidenceToken(token, complaintId, filename) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    return (
      decoded &&
      decoded.scope === 'citizen_evidence' &&
      decoded.complaint_id === String(complaintId) &&
      decoded.filename === String(filename)
    );
  } catch {
    return false;
  }
}

module.exports = {
  signCitizenEvidenceToken,
  verifyCitizenEvidenceToken,
};

