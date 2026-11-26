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

function formatAdminComplaintRow(row) {
  if (!row) return null;
  return {
    ...row,
    village: row.village_name || row.village || 'N/A',
    images: buildAdminImageUrls(row.id, row.image_path),
  };
}

function formatPublicComplaintRow(row) {
  if (!row) return null;
  return {
    complaint_id: row.complaint_id,
    name: maskPersonName(row.name),
    mobile: maskMobile(row.mobile),
    village: row.village_name || row.village || 'N/A',
    ward_no: row.ward_no || '',
    category: row.category || 'N/A',
    title: row.title || '',
    description: row.description || '',
    images: buildCitizenImageUrls(row.complaint_id, row.image_path),
    audio_path: null,
    status: row.status,
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

    await connection.execute(
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
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', NOW())`,
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
      ]
    );

    await connection.commit();

    return {
      complaint_id: complaintId,
      images: imagePaths.map((p) => path.basename(p)),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function trackComplaint(complaintId, mobile) {
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

  const complaint = formatPublicComplaintRow(rows[0]);
  const updates = [
    {
      status: complaint.status,
      remarks: `Current status: ${complaint.status}`,
      updated_at: complaint.created_at,
    },
  ];

  return {
    complaint,
    updates,
  };
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

  return {
    villages,
    stats,
    urgentCount: (stats.Submitted || 0) + (stats.Verified || 0),
    recentComplaints: recentRows.map(formatAdminComplaintRow),
  };
}

async function getAdminComplaints(panchayathId, { status = '', search = '' } = {}) {
  const villages = await getPanchayathVillages(panchayathId);
  const villageIds = villages.map((v) => v.id);

  const joinedScope = buildPanchayathScopeClause(panchayathId, villageIds, 'c');
  const conditions = [joinedScope.clause];
  const params = [...joinedScope.params];

  if (status && ALLOWED_STATUSES.includes(status)) {
    conditions.push('c.status = ?');
    params.push(status);
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

  return rows.map(formatAdminComplaintRow);
}

async function getAdminComplaintById(panchayathId, id) {
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

  return rows.length > 0 ? formatAdminComplaintRow(rows[0]) : null;
}

async function adminComplaintHasImage(panchayathId, id, filename) {
  const complaint = await getAdminComplaintById(panchayathId, id);
  if (!complaint) return false;
  const target = path.basename(String(filename || ''));
  return parseImagePaths(complaint.image_path).some((p) => path.basename(p) === target);
}

async function updateAdminComplaintStatus(panchayathId, id, status) {
  const existing = await getAdminComplaintById(panchayathId, id);
  if (!existing) {
    return null;
  }

  await pool.execute('UPDATE complaints SET status = ? WHERE id = ?', [status, existing.id]);
  return getAdminComplaintById(panchayathId, existing.id);
}

module.exports = {
  getActiveVillages,
  createComplaint,
  trackComplaint,
  complaintHasImage,
  findComplaintsByMobile,
  getPanchayathVillages,
  getDashboardData,
  getAdminComplaints,
  getAdminComplaintById,
  adminComplaintHasImage,
  updateAdminComplaintStatus,
};
