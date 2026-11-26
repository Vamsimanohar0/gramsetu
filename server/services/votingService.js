const { pool } = require('../config/db');
const { hashVoterMobile, normalizeMobileNumber } = require('../utils/voterHash');
const {
  getVotingAvailability,
  requireActiveVerificationProvider,
} = require('./verificationService');

const VOTING_ELIGIBLE_STATUSES = ['Submitted', 'Verified', 'Assigned', 'In Progress'];

async function getVoteCountByComplaintPk(connectionOrPool, complaintPk) {
  const [rows] = await connectionOrPool.execute(
    'SELECT COUNT(*) AS count FROM complaint_votes WHERE complaint_pk = ?',
    [complaintPk]
  );
  return Number(rows[0]?.count || 0);
}

async function initiateVoteChallenge({ complaintId, mobile }) {
  const provider = requireActiveVerificationProvider();
  const normalizedMobile = normalizeMobileNumber(mobile);
  return provider.startVerification({ complaintId, mobile: normalizedMobile });
}

async function castVerifiedVote({ complaintId, mobile, verificationToken }) {
  const provider = requireActiveVerificationProvider();
  const normalizedMobile = normalizeMobileNumber(mobile);

  const verificationResult = await provider.verifyAction({
    complaintId,
    mobile: normalizedMobile,
    verificationToken,
  });

  if (!verificationResult || !verificationResult.verified) {
    const err = new Error('Mobile verification failed or expired.');
    err.statusCode = 403;
    err.code = 'MOBILE_VERIFICATION_FAILED';
    throw err;
  }

  const verifiedMobile = verificationResult.normalizedMobile || normalizedMobile;
  const voterMobileHmac = hashVoterMobile(verifiedMobile);
  const method = String(verificationResult.method || provider.methodName || 'verified').slice(0, 32);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [complaints] = await connection.execute(
      'SELECT id, complaint_id, status FROM complaints WHERE complaint_id = ? LIMIT 1',
      [complaintId]
    );

    if (complaints.length === 0) {
      const err = new Error('Complaint not found.');
      err.statusCode = 404;
      throw err;
    }

    const complaint = complaints[0];
    if (!VOTING_ELIGIBLE_STATUSES.includes(complaint.status)) {
      const err = new Error('Voting is only available for active unresolved complaints.');
      err.statusCode = 400;
      throw err;
    }

    try {
      await connection.execute(
        `INSERT INTO complaint_votes (complaint_pk, voter_mobile_hmac, verification_method, verified_at)
         VALUES (?, ?, ?, NOW())`,
        [complaint.id, voterMobileHmac, method]
      );
    } catch (insertErr) {
      if (insertErr && (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062)) {
        const dupErr = new Error('This verified mobile number has already voted for this complaint.');
        dupErr.statusCode = 409;
        dupErr.code = 'DUPLICATE_VOTE';
        throw dupErr;
      }
      throw insertErr;
    }

    const voteCount = await getVoteCountByComplaintPk(connection, complaint.id);
    await connection.commit();

    return {
      complaint_id: complaint.complaint_id,
      status: complaint.status,
      vote_count: voteCount,
      voted: true,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function withdrawVerifiedVote({ complaintId, mobile, verificationToken }) {
  const provider = requireActiveVerificationProvider();
  const normalizedMobile = normalizeMobileNumber(mobile);

  const verificationResult = await provider.verifyAction({
    complaintId,
    mobile: normalizedMobile,
    verificationToken,
  });

  if (!verificationResult || !verificationResult.verified) {
    const err = new Error('Mobile verification failed or expired.');
    err.statusCode = 403;
    err.code = 'MOBILE_VERIFICATION_FAILED';
    throw err;
  }

  const verifiedMobile = verificationResult.normalizedMobile || normalizedMobile;
  const voterMobileHmac = hashVoterMobile(verifiedMobile);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [complaints] = await connection.execute(
      'SELECT id, complaint_id, status FROM complaints WHERE complaint_id = ? LIMIT 1',
      [complaintId]
    );

    if (complaints.length === 0) {
      const err = new Error('Complaint not found.');
      err.statusCode = 404;
      throw err;
    }

    const complaint = complaints[0];
    const [result] = await connection.execute(
      'DELETE FROM complaint_votes WHERE complaint_pk = ? AND voter_mobile_hmac = ?',
      [complaint.id, voterMobileHmac]
    );

    if (!result || result.affectedRows === 0) {
      const notFoundErr = new Error('No vote found for this verified mobile number on this complaint.');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    const voteCount = await getVoteCountByComplaintPk(connection, complaint.id);
    await connection.commit();

    return {
      complaint_id: complaint.complaint_id,
      status: complaint.status,
      vote_count: voteCount,
      voted: false,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  VOTING_ELIGIBLE_STATUSES,
  getVotingAvailability,
  initiateVoteChallenge,
  castVerifiedVote,
  withdrawVerifiedVote,
};

