const crypto = require('crypto');

const ALLOWED_STATUSES = [
  'Submitted',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Rejected',
];

const ADMIN_UI_STATUSES = [
  'Submitted',
  'Verified',
  'In Progress',
  'Resolved',
  'Rejected',
];

/**
 * Generates a tracking ID matching the PHP pattern GS-YYYY-XXXXX.
 * @returns {string}
 */
function generateComplaintId() {
  const year = new Date().getFullYear();
  const num = crypto.randomInt(10000, 100000);
  return `GS-${year}-${num}`;
}

/**
 * Normalizes `image_path` stored either as a JSON array string or legacy single path.
 * @param {string|null|undefined} rawImagePath
 * @returns {string[]}
 */
function parseImagePaths(rawImagePath) {
  if (!rawImagePath || rawImagePath === 'NULL') {
    return [];
  }

  const trimmed = String(rawImagePath).trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      return [];
    }
  }

  return [trimmed];
}

module.exports = {
  ALLOWED_STATUSES,
  ADMIN_UI_STATUSES,
  generateComplaintId,
  parseImagePaths,
};

