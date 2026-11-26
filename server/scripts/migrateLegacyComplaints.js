/**
 * Safe legacy complaint migration & manual review workflow.
 *
 * Usage:
 *   node scripts/migrateLegacyComplaints.js
 *       -> Dry-run classification (read-only)
 *   node scripts/migrateLegacyComplaints.js --apply
 *       -> Applies unambiguous matches in a tracked batch (`batch_id`)
 *   node scripts/migrateLegacyComplaints.js --export-review [out.json]
 *       -> Exports ambiguous/unmatched records for human review
 *   node scripts/migrateLegacyComplaints.js --apply-manual <manifest.json>
 *       -> Applies human-reviewed `assigned_village_id` mappings in a tracked batch
 *   node scripts/migrateLegacyComplaints.js --rollback <batch_id>
 *       -> Reverses ONLY the specified `batch_id`
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const DEFAULT_MANIFEST_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'database',
  'migrations',
  'legacy_review_manifest.json'
);

const AUDIT_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS legacy_complaint_mapping_audit (
    complaint_pk int(11) NOT NULL,
    batch_id varchar(64) NOT NULL,
    mapping_source enum('auto_unambiguous','manual_review') NOT NULL DEFAULT 'auto_unambiguous',
    complaint_id varchar(20) DEFAULT NULL,
    legacy_village_text varchar(100) DEFAULT NULL,
    previous_village_id int(11) DEFAULT NULL,
    previous_panchayath_id int(11) DEFAULT NULL,
    mapped_village_id int(11) NOT NULL,
    mapped_panchayath_id int(11) NOT NULL,
    migrated_at timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (complaint_pk),
    KEY idx_batch_id (batch_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`;

function normalizeVillageName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function makeBatchId(prefix = 'auto') {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${prefix}_${stamp}_${Math.random().toString(36).slice(2, 6)}`;
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
        name: c.name || null,
        title: c.title || null,
        legacy_village: c.village,
        candidate_villages: matches.map((m) => ({
          village_id: m.id,
          village_name: m.name,
          panchayath_id: m.panchayath_id,
          panchayath_name: m.panchayath_name || null,
        })),
        candidate_village_ids: matches.map((m) => m.id),
        candidate_panchayath_ids: matches.map((m) => m.panchayath_id),
      });
    } else {
      unmatched.push({ ...c, reason: 'no_matching_active_village' });
    }
  }

  return { unambiguous, ambiguous, unmatched };
}

function buildManualReviewManifest(classification, activeVillages = []) {
  const items = [
    ...classification.ambiguous.map((row) => ({
      complaint_pk: row.id,
      complaint_id: row.complaint_id,
      legacy_village_text: row.legacy_village,
      classification: 'AMBIGUOUS_MANUAL_REVIEW_REQUIRED',
      candidate_villages: row.candidate_villages,
      assigned_village_id: null,
      reviewer_note: '',
    })),
    ...classification.unmatched.map((row) => ({
      complaint_pk: row.id,
      complaint_id: row.complaint_id,
      name: row.name || null,
      title: row.title || null,
      legacy_village_text: row.village ?? null,
      classification: row.reason === 'empty_village_text' ? 'UNMATCHED_EMPTY' : 'UNMATCHED_UNKNOWN_VILLAGE',
      candidate_villages: [],
      assigned_village_id: null,
      reviewer_note: '',
    })),
  ];

  return {
    generated_at: new Date().toISOString(),
    instructions:
      'Set assigned_village_id to a valid active village ID from available_villages for records you want to assign, then run: node scripts/migrateLegacyComplaints.js --apply-manual <this-file>',
    available_villages: activeVillages.map((v) => ({
      id: v.id,
      name: v.name,
      panchayath_id: v.panchayath_id,
      panchayath_name: v.panchayath_name || null,
    })),
    records: items,
  };
}

function validateManualAssignments(manifestRecords = [], activeVillages = [], unmappedComplaints = []) {
  const villageMap = new Map(activeVillages.map((v) => [Number(v.id), v]));
  const complaintMap = new Map(unmappedComplaints.map((c) => [Number(c.id), c]));

  const approved = [];
  const skipped = [];
  const errors = [];

  for (const item of manifestRecords) {
    if (item.assigned_village_id === null || item.assigned_village_id === undefined || item.assigned_village_id === '') {
      skipped.push(item.complaint_pk);
      continue;
    }

    const complaintPk = Number.parseInt(item.complaint_pk, 10);
    const assignedVillageId = Number.parseInt(item.assigned_village_id, 10);
    const complaintRow = complaintMap.get(complaintPk);
    const targetVillage = villageMap.get(assignedVillageId);

    if (!complaintRow) {
      errors.push(`Complaint pk=${item.complaint_pk} is not an unmapped legacy complaint.`);
      continue;
    }
    if (!targetVillage) {
      errors.push(`Invalid or inactive assigned_village_id=${item.assigned_village_id} for complaint pk=${complaintPk}.`);
      continue;
    }

    approved.push({
      id: complaintRow.id,
      complaint_id: complaintRow.complaint_id,
      legacy_village: complaintRow.village ?? null,
      village_id: targetVillage.id,
      panchayath_id: targetVillage.panchayath_id,
    });
  }

  return { approved, skipped, errors };
}

async function applyMappingsBatch(mappings, mappingSource, batchId) {
  if (mappings.length === 0) return { batchId, appliedCount: 0 };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(AUDIT_TABLE_DDL);

    let appliedCount = 0;
    for (const item of mappings) {
      const [auditRes] = await connection.execute(
        `INSERT IGNORE INTO legacy_complaint_mapping_audit
         (complaint_pk, batch_id, mapping_source, complaint_id, legacy_village_text, previous_village_id, previous_panchayath_id, mapped_village_id, mapped_panchayath_id)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
        [
          item.id,
          batchId,
          mappingSource,
          item.complaint_id,
          item.legacy_village,
          item.village_id,
          item.panchayath_id,
        ]
      );

      if (auditRes.affectedRows > 0) {
        const [updRes] = await connection.execute(
          'UPDATE complaints SET village_id = ?, panchayath_id = ? WHERE id = ? AND village_id IS NULL AND panchayath_id IS NULL',
          [item.village_id, item.panchayath_id, item.id]
        );
        if (updRes.affectedRows === 0) {
          throw new Error(`Complaint id=${item.id} was already mapped concurrently; aborting batch.`);
        }
        appliedCount += 1;
      }
    }

    await connection.commit();
    return { batchId, appliedCount };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function rollbackBatch(batchId) {
  if (!batchId) {
    throw new Error('A batch_id is required for --rollback <batch_id>.');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [auditRows] = await connection.execute(
      'SELECT complaint_pk, previous_village_id, previous_panchayath_id FROM legacy_complaint_mapping_audit WHERE batch_id = ?',
      [batchId]
    );

    if (auditRows.length === 0) {
      await connection.rollback();
      return { batchId, revertedCount: 0 };
    }

    const [updRes] = await connection.execute(
      `UPDATE complaints c
       INNER JOIN legacy_complaint_mapping_audit a ON c.id = a.complaint_pk
       SET c.village_id = a.previous_village_id, c.panchayath_id = a.previous_panchayath_id
       WHERE a.batch_id = ?`,
      [batchId]
    );

    await connection.execute('DELETE FROM legacy_complaint_mapping_audit WHERE batch_id = ?', [batchId]);
    await connection.commit();
    return { batchId, revertedCount: updRes.affectedRows };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function fetchUnmappedAndVillages() {
  const [complaints] = await pool.execute(
    'SELECT id, complaint_id, name, title, village, village_id, panchayath_id FROM complaints WHERE village_id IS NULL AND panchayath_id IS NULL ORDER BY id ASC'
  );
  const [activeVillages] = await pool.execute(
    `SELECT v.id, v.name, v.panchayath_id, v.status, p.name AS panchayath_name
     FROM villages v
     LEFT JOIN panchayaths p ON v.panchayath_id = p.id
     WHERE v.status = 'active'
     ORDER BY v.id ASC`
  );
  return { complaints, activeVillages };
}

async function run(argv = process.argv.slice(2)) {
  const rollbackIdx = argv.indexOf('--rollback');
  if (rollbackIdx !== -1) {
    const batchId = argv[rollbackIdx + 1];
    const res = await rollbackBatch(batchId);
    console.log(`Rollback for batch "${res.batchId}" complete. Reverted ${res.revertedCount} complaint(s).`);
    return res;
  }

  const { complaints, activeVillages } = await fetchUnmappedAndVillages();
  const applyManualIdx = argv.indexOf('--apply-manual');
  if (applyManualIdx !== -1) {
    const manifestPath = argv[applyManualIdx + 1];
    if (!manifestPath) {
      throw new Error('Usage: --apply-manual <manifest.json>');
    }
    const raw = await fs.promises.readFile(path.resolve(manifestPath), 'utf8');
    const manifest = JSON.parse(raw);
    const validation = validateManualAssignments(manifest.records || [], activeVillages, complaints);
    if (validation.errors.length > 0) {
      throw new Error(`Manual review validation failed:\n- ${validation.errors.join('\n- ')}`);
    }
    const batchId = makeBatchId('manual');
    const result = await applyMappingsBatch(validation.approved, 'manual_review', batchId);
    console.log(
      `Manual review batch "${result.batchId}" applied ${result.appliedCount} complaint(s) (skipped ${validation.skipped.length}).`
    );
    return result;
  }

  const report = classifyLegacyComplaints(complaints, activeVillages);
  const exportIdx = argv.indexOf('--export-review');
  if (exportIdx !== -1) {
    const outPath = argv[exportIdx + 1] && !argv[exportIdx + 1].startsWith('--')
      ? path.resolve(argv[exportIdx + 1])
      : DEFAULT_MANIFEST_PATH;
    const manifest = buildManualReviewManifest(report, activeVillages);
    await fs.promises.writeFile(outPath, JSON.stringify(manifest, null, 2));
    console.log(`Exported ${manifest.records.length} record(s) for manual review to ${outPath}`);
    return manifest;
  }

  console.log(`Unmapped complaints found: ${complaints.length}`);
  console.log(`  Unambiguous matches : ${report.unambiguous.length}`);
  console.log(`  Ambiguous (skipped) : ${report.ambiguous.length}`);
  console.log(`  Unmatched (skipped) : ${report.unmatched.length}`);

  if (report.ambiguous.length > 0 || report.unmatched.length > 0) {
    console.log('Run with --export-review to generate a manual review manifest for remaining records.');
  }

  if (argv.includes('--apply')) {
    const batchId = makeBatchId('auto');
    const res = await applyMappingsBatch(report.unambiguous, 'auto_unambiguous', batchId);
    console.log(`Applied ${res.appliedCount} unambiguous mapping(s) in batch "${res.batchId}".`);
    console.log(`To reverse this batch: node scripts/migrateLegacyComplaints.js --rollback ${res.batchId}`);
    return { ...report, ...res };
  }

  console.log('Dry-run complete. Re-run with --apply after taking a backup to commit unambiguous mappings.');
  return report;
}

if (require.main === module) {
  run(process.argv.slice(2))
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
  buildManualReviewManifest,
  validateManualAssignments,
  applyMappingsBatch,
  rollbackBatch,
  run,
};
