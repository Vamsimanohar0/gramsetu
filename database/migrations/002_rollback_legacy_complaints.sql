-- Rollback for Migration 002: Reverses ONLY the intended migration batch (`@target_batch_id`).
-- Preserves all other batches, complaints, IDs, statuses, and newly submitted records.

USE `vgmp`;

-- Change @target_batch_id if rolling back a different batch (e.g. from `migrateLegacyComplaints.js --apply`).
SET @target_batch_id = 'batch_002_auto_unambiguous';

START TRANSACTION;

UPDATE complaints c
INNER JOIN legacy_complaint_mapping_audit a
  ON c.id = a.complaint_pk
SET
  c.village_id = a.previous_village_id,
  c.panchayath_id = a.previous_panchayath_id
WHERE a.batch_id = @target_batch_id;

DELETE FROM legacy_complaint_mapping_audit
WHERE batch_id = @target_batch_id;

COMMIT;
