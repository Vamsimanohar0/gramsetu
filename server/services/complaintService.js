const { pool } = require('../config/db');
const {
  ALLOWED_STATUSES,
  generateComplaintId,
  parseImagePaths,
} = require('../utils/complaintUtils');

function formatComplaintRow(row) {
  if (!row) return null;
  return {
    ...row,
    village: row.village_name || row.village || 'N/A',
    images: parseImagePaths(row.image_path),
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
      images: imagePaths,
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

  const complaint = formatComplaintRow(rows[0]);
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

  return rows;
}

async function getPanchayathVillages(panchayathId) {
  const [rows] = await pool.execute(
    "SELECT id, name FROM villages WHERE panchayath_id = ? AND status = 'active' ORDER BY name ASC",
    [panchayathId]
  );
  return rows;
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

  if (villageIds.length === 0) {
    return {
      villages: [],
      stats: emptyStats,
      urgentCount: 0,
      recentComplaints: [],
    };
  }

  const placeholders = villageIds.map(() => '?').join(',');

  const [statusRows] = await pool.execute(
    `SELECT status, COUNT(*) AS count
     FROM complaints
     WHERE village_id IN (${placeholders})
     GROUP BY status`,
    villageIds
  );

  const stats = { ...emptyStats };
  for (const row of statusRows) {
    if (ALLOWED_STATUSES.includes(row.status)) {
      stats[row.status] = Number(row.count);
    }
    stats.total += Number(row.count);
  }

  const [recentRows] = await pool.execute(
    `SELECT c.*, v.name AS village_name
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE c.village_id IN (${placeholders})
     ORDER BY c.created_at DESC
     LIMIT 10`,
    villageIds
  );

  return {
    villages,
    stats,
    urgentCount: (stats.Submitted || 0) + (stats.Verified || 0),
    recentComplaints: recentRows.map(formatComplaintRow),
  };
}

async function getAdminComplaints(panchayathId, { status = '', search = '' } = {}) {
  const villages = await getPanchayathVillages(panchayathId);
  const villageIds = villages.map((v) => v.id);

  if (villageIds.length === 0) {
    return [];
  }

  const placeholders = villageIds.map(() => '?').join(',');
  const conditions = [`c.village_id IN (${placeholders})`];
  const params = [...villageIds];

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
    `SELECT c.*, v.name AS village_name
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.created_at DESC`,
    params
  );

  return rows.map(formatComplaintRow);
}

async function getAdminComplaintById(panchayathId, id) {
  const numericId = Number.parseInt(id, 10);
  if (!numericId || Number.isNaN(numericId) || numericId <= 0) {
    return null;
  }

  const villages = await getPanchayathVillages(panchayathId);
  const villageIds = villages.map((v) => v.id);
  if (villageIds.length === 0) {
    return null;
  }

  const placeholders = villageIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT c.*, COALESCE(v.name, c.village) AS village_name
     FROM complaints c
     LEFT JOIN villages v ON c.village_id = v.id
     WHERE c.id = ? AND c.village_id IN (${placeholders})
     LIMIT 1`,
    [numericId, ...villageIds]
  );

  return rows.length > 0 ? formatComplaintRow(rows[0]) : null;
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
  findComplaintsByMobile,
  getPanchayathVillages,
  getDashboardData,
  getAdminComplaints,
  getAdminComplaintById,
  updateAdminComplaintStatus,
};

