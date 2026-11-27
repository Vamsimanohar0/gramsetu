const path = require('path');
const { pool } = require('../config/db');
const {
  ALLOWED_STATUSES,
  generateComplaintId,
  parseImagePaths,
  maskPersonName,
  maskMobile,
  maskTitle,
} = require('../utils/complaintUtils');
const { signCitizenEvidenceToken } = require('../utils/evidenceToken');
const { toApproximateCoordinates } = require('../utils/locationUtils');

let warnedMissingOptionalTable = false;

function isMissingOptionalTable(err) {
  return Boolean(err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146));
}

function logOptionalTableWarning(err) {
  if (!warnedMissingOptionalTable && process.env.NODE_ENV !== 'test') {
    warnedMissingOptionalTable = true;
    console.warn(
      `[GramSetu Schema Notice] Optional table missing (${err.message}). Apply database/migrations/004_release_features.sql for full voting/history/feedback features.`
    );
  }
}

async function safeGetVoteCountsMap(complaintPks = []) {
  const uniqueIds = [...new Set(complaintPks.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  const map = new Map();
  if (uniqueIds.length === 0) {
    return map;
  }

  const placeholders = uniqueIds.map(() => '?').join(',');
  try {
    const [rows] = await pool.execute(
      `SELECT complaint_pk, COUNT(*) AS vote_count
       FROM complaint_votes
       WHERE complaint_pk IN (${placeholders})
       GROUP BY complaint_pk`,
      uniqueIds
    );
    for (const row of Array.isArray(rows) ? rows : []) {
      map.set(Number(row.complaint_pk), Number(row.vote_count || 0));
    }
  } catch (err) {
    if (isMissingOptionalTable(err)) {
      logOptionalTableWarning(err);
      return map;
    }
    throw err;
  }
  return map;
}

async function safeGetUserVotedSet(complaintPks = [], voterKeyHmac = '') {
  const votedSet = new Set();
  if (!voterKeyHmac) {
    return votedSet;
  }
  const uniqueIds = [...new Set(complaintPks.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueIds.length === 0) {
    return votedSet;
  }

  const placeholders = uniqueIds.map(() => '?').join(',');
  try {
    const [rows] = await pool.execute(
      `SELECT complaint_pk
       FROM complaint_votes
       WHERE voter_key_hmac = ? AND complaint_pk IN (${placeholders})`,
      [voterKeyHmac, ...uniqueIds]
    );
    for (const row of Array.isArray(rows) ? rows : []) {
      votedSet.add(Number(row.complaint_pk));
    }
  } catch (err) {
    if (isMissingOptionalTable(err)) {
      logOptionalTableWarning(err);
      return votedSet;
    }
    throw err;
  }
  return votedSet;
}

function buildAdminImageUrls(complaintPk, rawImagePath) {
  return parseImagePaths(rawImagePath).map((imgPath) => {
    const filename = path.basename(imgPath);
    return `/api/admin/complaints/${complaintPk}/evidence/${encodeURIComponent(filename)}`;
  });
}

function buildCitizenImageUrls(complaintId, rawImagePath) {
  return parseImagePaths(rawImagePath).map((imgPath) => {
    const filename = path.basename(imgPath);
    const token = signCitizenEvidenceToken(complaintId, filename);
    return `/api/complaints/evidence/${encodeURIComponent(complaintId)}/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  });
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatAdminComplaintRow(row, voteCountMap = null) {
  if (!row) return null;
  const latitude = toNullableNumber(row.latitude);
  const longitude = toNullableNumber(row.longitude);
  const approxLatitude = toNullableNumber(row.approx_latitude);
  const approxLongitude = toNullableNumber(row.approx_longitude);
  const resolvedVoteCount =
    voteCountMap && row.id ? voteCountMap.get(Number(row.id)) : undefined;

  return {
    ...row,
    village: row.village_name || row.village || 'N/A',
    images: buildAdminImageUrls(row.id, row.image_path),
    latitude,
    longitude,
    approx_latitude: approxLatitude,
    approx_longitude: approxLongitude,
    location_source: row.location_source || null,
    has_location: latitude !== null && longitude !== null,
    vote_count: Number(resolvedVoteCount ?? row.vote_count ?? 0),
  };
}

function formatPublicComplaintRow(row, { voteCountMap = null, userVotedSet = null } = {}) {
  if (!row) return null;
  const approxLatitude = toNullableNumber(row.approx_latitude);
  const approxLongitude = toNullableNumber(row.approx_longitude);
  const resolvedVoteCount =
    voteCountMap && row.id ? voteCountMap.get(Number(row.id)) : undefined;
  const hasUserVoted =
    userVotedSet && row.id ? userVotedSet.has(Number(row.id)) : Boolean(row.user_voted);

  return {
    complaint_id: row.complaint_id,
    name: maskPersonName(row.name),
    mobile: maskMobile(row.mobile),
    village_id: row.village_id || null,
    village: row.village_name || row.village || 'N/A',
    ward_no: row.ward_no || '',
    category: row.category || 'N/A',
    title: row.title || '',
    description: row.description || '',
    images: buildCitizenImageUrls(row.complaint_id, row.image_path),
    audio_path: null,
    status: row.status,
    vote_count: Number(resolvedVoteCount ?? row.vote_count ?? 0),
    user_voted: hasUserVoted,
    has_location: approxLatitude !== null && approxLongitude !== null,
    approx_latitude: approxLatitude,
    approx_longitude: approxLongitude,
    created_at: row.created_at,
  };
}

async function getActiveVillages() {
  const [rows] = await pool.execute(
    `SELECT v.id, v.name AS village_name, v.panchayath_id, p.name AS panchayath_name
     FROM villages v
     LEFT JOIN panchayaths p ON v.panchayath_id = p.id
     WHERE v.status = 'active'
     ORDER BY v.name ASC`
  );
  return rows;
}

async function createComplaint(data, uploadedFiles = []) {
  const imagePaths = uploadedFiles.map((file) => `uploads/images/${file.filename}`);
  const imagePathsJson = imagePaths.length > 0 ? JSON.stringify(imagePaths) : null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [villageRows] = await connection.execute(
      "SELECT id, panchayath_id FROM villages WHERE id = ? AND status = 'active' LIMIT 1",
      [data.villageId]
    );

    if (villageRows.length === 0) {
      const err = new Error('Selected village is invalid or inactive');
      err.statusCode = 400;
      throw err;
    }

    const panchayathId = villageRows[0].panchayath_id || null;

    let complaintId = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateComplaintId();
      const [existing] = await connection.execute(
        'SELECT id FROM complaints WHERE complaint_id = ? LIMIT 1',
        [candidate]
      );
      if (existing.length === 0) {
        complaintId = candidate;
        break;
      }
    }

    if (!complaintId) {
      throw new Error('Could not generate a unique Complaint ID. Please try again.');
    }

    const hasCoords = data.latitude !== null && data.longitude !== null &&
      data.latitude !== undefined && data.longitude !== undefined;
    const { approxLatitude, approxLongitude } = hasCoords
      ? toApproximateCoordinates(data.latitude, data.longitude, complaintId)
      : { approxLatitude: null, approxLongitude: null };

    const [insertResult] = await connection.execute(
      `INSERT INTO complaints (
        complaint_id,
        name,
        mobile,
        village_id,
        panchayath_id,
        ward_no,
        category,
        title,
        description,
        image_path,
        latitude,
        longitude,
        approx_latitude,
        approx_longitude,
        location_source,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', NOW())`,
      [
        complaintId,
        data.name,
        data.mobile,
        data.villageId,
        panchayathId,
        data.wardNo,
        data.category,
        data.title,
        data.description,
        imagePathsJson,
        hasCoords ? data.latitude : null,
        hasCoords ? data.longitude : null,
        approxLatitude,
        approxLongitude,
        hasCoords ? data.locationSource : null,
      ]
    );

    if (insertResult && insertResult.insertId) {
      try {
        await connection.execute(
          `INSERT INTO complaint_status_history (
            complaint_pk,
            from_status,
            to_status,
            actor_type,
            actor_id,
            note
          ) VALUES (?, NULL, 'Submitted', 'system', NULL, ?)`,
          [insertResult.insertId, 'Complaint registered by citizen']
        );
      } catch (histErr) {
        if (!isMissingOptionalTable(histErr)) throw histErr;
        logOptionalTableWarning(histErr);
      }
    }

    await connection.commit();

    return {
      complaint_id: complaintId,
      images: imagePaths.map((p) => path.basename(p)),
      has_location: hasCoords,
      approx_latitude: approxLatitude,
      approx_longitude: approxLongitude,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function getComplaintHistoryAndFeedback(connectionOrPool, complaintPk, currentStatus, createdAt) {
  let historyRows = [];
  try {
    const [rows] = await connectionOrPool.execute(
      `SELECT id, from_status, to_status, actor_type, note, created_at
       FROM complaint_status_history
       WHERE complaint_pk = ?
       ORDER BY created_at ASC, id ASC`,
      [complaintPk]
    );
    historyRows = rows;
  } catch (err) {
    if (isMissingOptionalTable(err)) {
      logOptionalTableWarning(err);
    } else {
      throw err;
    }
  }

  const updates =
    Array.isArray(historyRows) && historyRows.length > 0
      ? historyRows.map((row) => ({
          id: row.id,
          from_status: row.from_status,
          status: row.to_status,
          actor_type: row.actor_type,
          remarks: row.note || `Status changed to ${row.to_status}`,
          updated_at: row.created_at,
        }))
      : [
          {
            status: currentStatus,
            remarks: `Current status: ${currentStatus}`,
            updated_at: createdAt,
          },
        ];

  let feedbackRows = [];
  try {
    const [rows] = await connectionOrPool.execute(
      `SELECT id, rating, comment, resolution_confirmed, reopen_requested, submitted_at, updated_at
       FROM complaint_feedback
       WHERE complaint_pk = ?
       LIMIT 1`,
      [complaintPk]
    );
    feedbackRows = rows;
  } catch (err) {
    if (isMissingOptionalTable(err)) {
      logOptionalTableWarning(err);
    } else {
      throw err;
    }
  }

  const feedback =
    Array.isArray(feedbackRows) && feedbackRows.length > 0
      ? {
          rating: Number(feedbackRows[0].rating),
          comment: feedbackRows[0].comment || '',
          resolution_confirmed: Boolean(Number(feedbackRows[0].resolution_confirmed)),
          reopen_requested: Boolean(Number(feedbackRows[0].reopen_requested)),
          submitted_at: feedbackRows[0].submitted_at,
          updated_at: feedbackRows[0].updated_at,
        }
      : null;

  return { updates, feedback };
}

async function trackComplaint(complaintId, mobile, { voterKeyHmac = '' } = {}) {
  const [rows] = await pool.execute(
    `SELECT c.*, COALESCE(v.name, c.village) AS village_name
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE c.complaint_id = ? AND c.mobile = ?
     LIMIT 1`,
    [complaintId, mobile]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const voteCountMap = row.id ? await safeGetVoteCountsMap([row.id]) : new Map();
  const userVotedSet = row.id ? await safeGetUserVotedSet([row.id], voterKeyHmac) : new Set();
  const complaint = formatPublicComplaintRow(row, { voteCountMap, userVotedSet });
  const { updates, feedback } = await getComplaintHistoryAndFeedback(
    pool,
    row.id,
    complaint.status,
    complaint.created_at
  );

  return {
    complaint,
    updates,
    feedback,
  };
}

async function submitComplaintFeedback({
  complaintId,
  mobile,
  rating,
  comment,
  resolutionConfirmed,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, complaint_id, status
       FROM complaints
       WHERE complaint_id = ? AND mobile = ?
       LIMIT 1`,
      [complaintId, mobile]
    );

    if (rows.length === 0) {
      const err = new Error('Complaint not found or mobile number does not match our records.');
      err.statusCode = 404;
      throw err;
    }

    const complaint = rows[0];
    const [existingFeedbackRows] = await connection.execute(
      `SELECT id, rating, comment, resolution_confirmed, reopen_requested
       FROM complaint_feedback
       WHERE complaint_pk = ?
       LIMIT 1`,
      [complaint.id]
    );

    const existingFeedback = existingFeedbackRows.length > 0 ? existingFeedbackRows[0] : null;
    const isResolved = complaint.status === 'Resolved';
    const isControlledCorrection = existingFeedback !== null && (isResolved || resolutionConfirmed === false);

    if (!isResolved && !isControlledCorrection) {
      const err = new Error('Feedback and reopening can only be submitted after a complaint is marked Resolved.');
      err.statusCode = 400;
      throw err;
    }

    if (!resolutionConfirmed && !isResolved && existingFeedback && Number(existingFeedback.reopen_requested) === 1) {
      const err = new Error('This complaint has already been reopened and is awaiting Panchayat review.');
      err.statusCode = 409;
      throw err;
    }

    const reopenTriggered = isResolved && resolutionConfirmed === false;
    const reopenRequestedFlag = reopenTriggered || (existingFeedback && Number(existingFeedback.reopen_requested) === 1 && !resolutionConfirmed) ? 1 : 0;

    if (existingFeedback) {
      await connection.execute(
        `UPDATE complaint_feedback
         SET rating = ?, comment = ?, resolution_confirmed = ?, reopen_requested = ?, updated_at = NOW()
         WHERE complaint_pk = ?`,
        [rating, comment || null, resolutionConfirmed ? 1 : 0, reopenRequestedFlag, complaint.id]
      );
    } else {
      await connection.execute(
        `INSERT INTO complaint_feedback (
          complaint_pk, rating, comment, resolution_confirmed, reopen_requested
        ) VALUES (?, ?, ?, ?, ?)`,
        [complaint.id, rating, comment || null, resolutionConfirmed ? 1 : 0, reopenRequestedFlag]
      );
    }

    let nextStatus = complaint.status;
    if (reopenTriggered) {
      nextStatus = 'Submitted';
      await connection.execute('UPDATE complaints SET status = ? WHERE id = ?', [
        nextStatus,
        complaint.id,
      ]);
      const reopenNote = comment
        ? `Citizen feedback (${rating}/5): Issue not resolved — reopened complaint. Note: ${comment}`
        : `Citizen feedback (${rating}/5): Issue not resolved — complaint reopened by citizen.`;
      await connection.execute(
        `INSERT INTO complaint_status_history (
          complaint_pk, from_status, to_status, actor_type, actor_id, note
        ) VALUES (?, 'Resolved', 'Submitted', 'citizen', NULL, ?)`,
        [complaint.id, reopenNote]
      );
    } else if (!existingFeedback) {
      const confirmNote = comment
        ? `Citizen feedback submitted (${rating}/5): Resolution confirmed. "${comment}"`
        : `Citizen feedback submitted (${rating}/5): Resolution confirmed by citizen.`;
      await connection.execute(
        `INSERT INTO complaint_status_history (
          complaint_pk, from_status, to_status, actor_type, actor_id, note
        ) VALUES (?, ?, ?, 'citizen', NULL, ?)`,
        [complaint.id, complaint.status, complaint.status, confirmNote]
      );
    }

    const { updates, feedback } = await getComplaintHistoryAndFeedback(
      connection,
      complaint.id,
      nextStatus,
      null
    );

    await connection.commit();

    return {
      complaint_id: complaint.complaint_id,
      status: nextStatus,
      reopened: reopenTriggered,
      corrected: Boolean(existingFeedback),
      feedback,
      updates,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function complaintHasImage(complaintId, filename) {
  const [rows] = await pool.execute(
    'SELECT image_path FROM complaints WHERE complaint_id = ? LIMIT 1',
    [complaintId]
  );
  if (rows.length === 0) return false;
  const target = path.basename(String(filename || ''));
  return parseImagePaths(rows[0].image_path).some((p) => path.basename(p) === target);
}

async function findComplaintsByMobile(mobile) {
  if (!mobile) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT complaint_id, title, status, created_at
     FROM complaints
     WHERE mobile = ?
     ORDER BY created_at DESC`,
    [mobile]
  );

  return rows.map((row) => ({
    complaint_id: row.complaint_id,
    title: maskTitle(row.title),
    status: row.status,
    created_at: row.created_at,
  }));
}

async function getPanchayathVillages(panchayathId) {
  const [rows] = await pool.execute(
    "SELECT id, name FROM villages WHERE panchayath_id = ? AND status = 'active' ORDER BY name ASC",
    [panchayathId]
  );
  return rows;
}

function buildPanchayathScopeClause(panchayathId, villageIds, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  if (villageIds.length === 0) {
    return {
      clause: `${prefix}panchayath_id = ?`,
      params: [panchayathId],
    };
  }
  const placeholders = villageIds.map(() => '?').join(',');
  return {
    clause: `(${prefix}panchayath_id = ? OR ${prefix}village_id IN (${placeholders}))`,
    params: [panchayathId, ...villageIds],
  };
}

async function getDashboardData(panchayathId) {
  const villages = await getPanchayathVillages(panchayathId);
  const villageIds = villages.map((v) => v.id);

  const emptyStats = {
    total: 0,
    Submitted: 0,
    Verified: 0,
    Assigned: 0,
    'In Progress': 0,
    Resolved: 0,
    Rejected: 0,
  };

  const scope = buildPanchayathScopeClause(panchayathId, villageIds);
  const joinedScope = buildPanchayathScopeClause(panchayathId, villageIds, 'c');

  const [statusRows] = await pool.execute(
    `SELECT status, COUNT(*) AS count
     FROM complaints
     WHERE ${scope.clause}
     GROUP BY status`,
    scope.params
  );

  const stats = { ...emptyStats };
  for (const row of statusRows) {
    if (ALLOWED_STATUSES.includes(row.status)) {
      stats[row.status] = Number(row.count);
    }
    stats.total += Number(row.count);
  }

  const [recentRows] = await pool.execute(
    `SELECT c.*, COALESCE(v.name, c.village) AS village_name
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE ${joinedScope.clause}
     ORDER BY c.created_at DESC
     LIMIT 10`,
    joinedScope.params
  );

  const voteCountMap = await safeGetVoteCountsMap((recentRows || []).map((r) => r.id));

  return {
    villages,
    stats,
    urgentCount: (stats.Submitted || 0) + (stats.Verified || 0),
    recentComplaints: recentRows.map((row) => formatAdminComplaintRow(row, voteCountMap)),
  };
}

async function getAdminComplaints(panchayathId, { status = '', search = '', villageId = '' } = {}) {
  const villages = await getPanchayathVillages(panchayathId);
  const villageIds = villages.map((v) => v.id);

  const joinedScope = buildPanchayathScopeClause(panchayathId, villageIds, 'c');
  const conditions = [joinedScope.clause];
  const params = [...joinedScope.params];

  if (status && ALLOWED_STATUSES.includes(status)) {
    conditions.push('c.status = ?');
    params.push(status);
  }

  const parsedVillageId = Number.parseInt(villageId, 10);
  if (parsedVillageId && !Number.isNaN(parsedVillageId) && parsedVillageId > 0) {
    conditions.push('c.village_id = ?');
    params.push(parsedVillageId);
  }

  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    conditions.push('(c.name LIKE ? OR c.complaint_id LIKE ? OR c.mobile LIKE ?)');
    const likeTerm = `%${trimmedSearch}%`;
    params.push(likeTerm, likeTerm, likeTerm);
  }

  const [rows] = await pool.execute(
    `SELECT c.*, COALESCE(v.name, c.village) AS village_name
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.created_at DESC`,
    params
  );

  const voteCountMap = await safeGetVoteCountsMap((rows || []).map((r) => r.id));
  return rows.map((row) => formatAdminComplaintRow(row, voteCountMap));
}

async function getAdminComplaintById(panchayathId, id, { includeDetails = false } = {}) {
  const numericId = Number.parseInt(id, 10);
  if (!numericId || Number.isNaN(numericId) || numericId <= 0) {
    return null;
  }

  const villages = await getPanchayathVillages(panchayathId);
  const villageIds = villages.map((v) => v.id);
  const joinedScope = buildPanchayathScopeClause(panchayathId, villageIds, 'c');

  const [rows] = await pool.execute(
    `SELECT c.*, COALESCE(v.name, c.village) AS village_name
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE c.id = ? AND ${joinedScope.clause}
     LIMIT 1`,
    [numericId, ...joinedScope.params]
  );

  if (rows.length === 0) {
    return null;
  }

  const voteCountMap = await safeGetVoteCountsMap([rows[0].id]);
  const formatted = formatAdminComplaintRow(rows[0], voteCountMap);
  if (!includeDetails) {
    return formatted;
  }

  const { updates, feedback } = await getComplaintHistoryAndFeedback(
    pool,
    formatted.id,
    formatted.status,
    formatted.created_at
  );

  return {
    ...formatted,
    updates,
    feedback,
  };
}

async function adminComplaintHasImage(panchayathId, id, filename) {
  const complaint = await getAdminComplaintById(panchayathId, id);
  if (!complaint) return false;
  const target = path.basename(String(filename || ''));
  return parseImagePaths(complaint.image_path).some((p) => path.basename(p) === target);
}

async function updateAdminComplaintStatus(panchayathId, id, status, note = '') {
  const existing = await getAdminComplaintById(panchayathId, id);
  if (!existing) {
    return null;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE complaints SET status = ? WHERE id = ?', [status, existing.id]);
    try {
      await connection.execute(
        `INSERT INTO complaint_status_history (
          complaint_pk, from_status, to_status, actor_type, actor_id, note
        ) VALUES (?, ?, ?, 'admin', ?, ?)`,
        [
          existing.id,
          existing.status || null,
          status,
          panchayathId,
          note || `Status updated by Panchayat Admin from ${existing.status} to ${status}`,
        ]
      );
    } catch (histErr) {
      if (!isMissingOptionalTable(histErr)) throw histErr;
      logOptionalTableWarning(histErr);
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getAdminComplaintById(panchayathId, existing.id, { includeDetails: true });
}

async function getPublicMapComplaints({ villageId = '', category = '', status = '', voterKeyHmac = '' } = {}) {
  const conditions = ['1 = 1'];
  const params = [];

  const parsedVillageId = Number.parseInt(villageId, 10);
  if (parsedVillageId && !Number.isNaN(parsedVillageId) && parsedVillageId > 0) {
    conditions.push('c.village_id = ?');
    params.push(parsedVillageId);
  }

  const trimmedCategory = String(category || '').trim();
  if (trimmedCategory) {
    conditions.push('c.category = ?');
    params.push(trimmedCategory);
  }

  const trimmedStatus = String(status || '').trim();
  if (trimmedStatus && ALLOWED_STATUSES.includes(trimmedStatus)) {
    conditions.push('c.status = ?');
    params.push(trimmedStatus);
  }

  const [rows] = await pool.execute(
    `SELECT c.id, c.complaint_id, c.village_id, COALESCE(v.name, c.village) AS village_name,
            c.category, c.title, c.status, c.approx_latitude, c.approx_longitude,
            c.created_at
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.created_at DESC`,
    params
  );

  const complaintPks = (rows || []).map((r) => r.id).filter(Boolean);
  const voteCountMap = await safeGetVoteCountsMap(complaintPks);
  const userVotedSet = await safeGetUserVotedSet(complaintPks, voterKeyHmac);

  const complaints = [];
  const markers = [];

  for (const row of rows) {
    const approxLat = toNullableNumber(row.approx_latitude);
    const approxLng = toNullableNumber(row.approx_longitude);
    const hasLocation = approxLat !== null && approxLng !== null;
    const resolvedVotes = row.id ? voteCountMap.get(Number(row.id)) : undefined;

    const publicItem = {
      complaint_id: row.complaint_id,
      village_id: row.village_id || null,
      village: row.village_name || 'N/A',
      category: row.category || 'N/A',
      title: row.title || '',
      status: row.status,
      vote_count: Number(resolvedVotes ?? row.vote_count ?? 0),
      user_voted: row.id ? userVotedSet.has(Number(row.id)) : false,
      has_location: hasLocation,
      approx_latitude: approxLat,
      approx_longitude: approxLng,
      created_at: row.created_at,
    };

    complaints.push(publicItem);
    if (hasLocation) {
      markers.push(publicItem);
    }
  }

  return {
    complaints,
    markers,
    summary: {
      total: complaints.length,
      mapped: markers.length,
      unmapped: complaints.length - markers.length,
    },
  };
}

async function getAdminMapComplaints(panchayathId, { villageId = '', category = '', status = '' } = {}) {
  const villages = await getPanchayathVillages(panchayathId);
  const villageIds = villages.map((v) => v.id);
  const joinedScope = buildPanchayathScopeClause(panchayathId, villageIds, 'c');

  const conditions = [joinedScope.clause];
  const params = [...joinedScope.params];

  const parsedVillageId = Number.parseInt(villageId, 10);
  if (parsedVillageId && !Number.isNaN(parsedVillageId) && parsedVillageId > 0) {
    conditions.push('c.village_id = ?');
    params.push(parsedVillageId);
  }

  const trimmedCategory = String(category || '').trim();
  if (trimmedCategory) {
    conditions.push('c.category = ?');
    params.push(trimmedCategory);
  }

  const trimmedStatus = String(status || '').trim();
  if (trimmedStatus && ALLOWED_STATUSES.includes(trimmedStatus)) {
    conditions.push('c.status = ?');
    params.push(trimmedStatus);
  }

  const [rows] = await pool.execute(
    `SELECT c.id, c.complaint_id, c.name, c.village_id, COALESCE(v.name, c.village) AS village_name,
            c.ward_no, c.category, c.title, c.status, c.latitude, c.longitude,
            c.approx_latitude, c.approx_longitude, c.location_source, c.created_at
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.created_at DESC`,
    params
  );

  const voteCountMap = await safeGetVoteCountsMap((rows || []).map((r) => r.id));
  const complaints = rows.map((row) => formatAdminComplaintRow(row, voteCountMap));
  const markers = complaints.filter((item) => item.latitude !== null && item.longitude !== null);

  return {
    villages,
    complaints,
    markers,
    summary: {
      total: complaints.length,
      mapped: markers.length,
      unmapped: complaints.length - markers.length,
    },
  };
}

module.exports = {
  getActiveVillages,
  createComplaint,
  trackComplaint,
  submitComplaintFeedback,
  complaintHasImage,
  findComplaintsByMobile,
  getPanchayathVillages,
  getDashboardData,
  getAdminComplaints,
  getAdminComplaintById,
  adminComplaintHasImage,
  updateAdminComplaintStatus,
  getPublicMapComplaints,
  getAdminMapComplaints,
};
