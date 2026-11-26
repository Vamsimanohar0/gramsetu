/**
 * Safe legacy complaint migration utility.
 * Usage:
 *   node scripts/migrateLegacyComplaints.js           # Dry-run report (no DB writes)
 *   node scripts/migrateLegacyComplaints.js --apply   # Applies unambiguous mappings inside a transaction
 */
const { pool } = require('../config/db');

function normalizeVillageName(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Classifies legacy complaints (where village_id IS NULL and panchayath_id IS NULL)
 * against active villages while guarding against ambiguous village names.
 */
function classifyLegacyComplaints(complaints = [], activeVillages = []) {
  const villagesByName = new Map();
  for (const v of activeVillages) {
    if (v.status && v.status !== 'active') continue;
    const key = normalizeVillageName(v.name);
    if (!key) continue;
    if (!villagesByName.has(key)) {
      villagesByName.set(key, []);
    }
    villagesByName.get(key).push(v);
  }

  const unambiguous = [];
  const ambiguous = [];
  const unmatched = [];

  for (const c of complaints) {
    if (c.village_id !== null && c.village_id !== undefined) continue;
    if (c.panchayath_id !== null && c.panchayath_id !== undefined) continue;

    const key = normalizeVillageName(c.village);
    if (!key) {
      unmatched.push({ ...c, reason: 'empty_village_text' });
      continue;
    }

    const matches = villagesByName.get(key) || [];
    if (matches.length === 1) {
      unambiguous.push({
        id: c.id,
        complaint_id: c.complaint_id,
        legacy_village: c.village,
        village_id: matches[0].id,
        panchayath_id: matches[0].panchayath_id,
      });
    } else if (matches.length > 1) {
      ambiguous.push({
        id: c.id,
        complaint_id: c.complaint_id,
        legacy_village: c.village,
        candidate_village_ids: matches.map((m) => m.id),
        candidate_panchayath_ids: matches.map((m) => m.panchayath_id),
      });
    } else {
      unmatched.push({ ...c, reason: 'no_matching_active_village' });
    }
  }

  return { unambiguous, ambiguous, unmatched };
}

async function run({ apply = false } = {}) {
  const [complaints] = await pool.execute(
    'SELECT id, complaint_id, village, village_id, panchayath_id FROM complaints WHERE village_id IS NULL AND panchayath_id IS NULL ORDER BY id ASC'
  );
  const [activeVillages] = await pool.execute(
    "SELECT id, name, panchayath_id, status FROM villages WHERE status = 'active' ORDER BY id ASC"
  );

  const report = classifyLegacyComplaints(complaints, activeVillages);
  console.log(`Unmapped complaints found: ${complaints.length}`);
  console.log(`  Unambiguous matches : ${report.unambiguous.length}`);
  console.log(`  Ambiguous (skipped) : ${report.ambiguous.length}`);
  console.log(`  Unmatched (skipped) : ${report.unmatched.length}`);

  if (report.ambiguous.length > 0) {
    console.warn('Ambiguous records requiring manual review:', report.ambiguous);
  }

  if (!apply || report.unambiguous.length === 0) {
    if (!apply) {
      console.log('Dry-run complete. Re-run with --apply after taking a backup to commit unambiguous mappings.');
    }
    return report;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS legacy_complaint_mapping_audit (
        complaint_pk int(11) NOT NULL,
        complaint_id varchar(20) DEFAULT NULL,
        legacy_village_text varchar(100) DEFAULT NULL,
        previous_village_id int(11) DEFAULT NULL,
        previous_panchayath_id int(11) DEFAULT NULL,
        mapped_village_id int(11) NOT NULL,
        mapped_panchayath_id int(11) NOT NULL,
        migrated_at timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (complaint_pk)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    for (const item of report.unambiguous) {
      await connection.execute(
        `INSERT IGNORE INTO legacy_complaint_mapping_audit
         (complaint_pk, complaint_id, legacy_village_text, previous_village_id, previous_panchayath_id, mapped_village_id, mapped_panchayath_id)
         VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
        [item.id, item.complaint_id, item.legacy_village, item.village_id, item.panchayath_id]
      );
      await connection.execute(
        'UPDATE complaints SET village_id = ?, panchayath_id = ? WHERE id = ? AND village_id IS NULL AND panchayath_id IS NULL',
        [item.village_id, item.panchayath_id, item.id]
      );
    }

    await connection.commit();
    console.log(`Applied ${report.unambiguous.length} unambiguous legacy complaint mapping(s).`);
    return report;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  const apply = process.argv.includes('--apply');
  run({ apply })
    .then(() => pool.end())
    .catch(async (err) => {
      console.error('Legacy complaint migration failed:', err.message);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}

module.exports = {
  normalizeVillageName,
  classifyLegacyComplaints,
  run,
};

