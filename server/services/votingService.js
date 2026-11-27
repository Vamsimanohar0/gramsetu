const { pool } = require('../config/db');

const VOTING_ELIGIBLE_STATUSES = ['Submitted', 'Verified', 'Assigned', 'In Progress'];

function isMissingTableError(err) {
  return Boolean(err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146));
}

async function getVoteCountByComplaintPk(connectionOrPool, complaintPk) {
  try {
    const [rows] = await connectionOrPool.execute(
      'SELECT COUNT(*) AS count FROM complaint_votes WHERE complaint_pk = ?',
      [complaintPk]
    );
    return Number(rows[0]?.count || 0);
  } catch (err) {
    if (isMissingTableError(err)) {
      return 0;
    }
    throw err;
  }
}

async function castVote({ complaintId, voterKeyHmac }) {
  if (!voterKeyHmac) {
    const err = new Error('Voter session could not be established.');
    err.statusCode = 400;
    throw err;
  }

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
        `INSERT INTO complaint_votes (complaint_pk, voter_key_hmac)
         VALUES (?, ?)`,
        [complaint.id, voterKeyHmac]
      );
    } catch (insertErr) {
      if (insertErr && (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062)) {
        const dupErr = new Error('You have already supported this complaint from this browser.');
        dupErr.statusCode = 409;
        dupErr.code = 'DUPLICATE_VOTE';
        throw dupErr;
      }
      if (isMissingTableError(insertErr)) {
        const tableErr = new Error('Voting storage table is unavailable until database migration is applied.');
        tableErr.statusCode = 503;
        tableErr.code = 'VOTING_TABLE_MISSING';
        throw tableErr;
      }
      throw insertErr;
    }

    const voteCount = await getVoteCountByComplaintPk(connection, complaint.id);
    await connection.commit();

    return {
      complaint_id: complaint.complaint_id,
      status: complaint.status,
      vote_count: voteCount,
      user_voted: true,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function withdrawVote({ complaintId, voterKeyHmac }) {
  if (!voterKeyHmac) {
    const err = new Error('No active vote session found for withdrawing support.');
    err.statusCode = 403;
    throw err;
  }

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
    let result;
    try {
      [result] = await connection.execute(
        'DELETE FROM complaint_votes WHERE complaint_pk = ? AND voter_key_hmac = ?',
        [complaint.id, voterKeyHmac]
      );
    } catch (delErr) {
      if (isMissingTableError(delErr)) {
        const tableErr = new Error('Voting storage table is unavailable until database migration is applied.');
        tableErr.statusCode = 503;
        tableErr.code = 'VOTING_TABLE_MISSING';
        throw tableErr;
      }
      throw delErr;
    }

    if (!result || result.affectedRows === 0) {
      const notFoundErr = new Error('You have not voted for this complaint yet.');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    const voteCount = await getVoteCountByComplaintPk(connection, complaint.id);
    await connection.commit();

    return {
      complaint_id: complaint.complaint_id,
      status: complaint.status,
      vote_count: voteCount,
      user_voted: false,
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
  castVote,
  withdrawVote,
};
