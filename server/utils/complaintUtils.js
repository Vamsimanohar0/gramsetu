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

function maskWord(word, visiblePrefix = 1) {
  if (!word) return '';
  if (word.length <= visiblePrefix) return '*'.repeat(word.length);
  return `${word.slice(0, visiblePrefix)}${'*'.repeat(word.length - visiblePrefix)}`;
}

function maskPersonName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return 'N/A';
  return trimmed
    .split(/\s+/)
    .map((part) => maskWord(part, 1))
    .join(' ');
}

function maskMobile(mobile) {
  const trimmed = String(mobile ?? '').trim();
  if (trimmed.length <= 4) return '****';
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

function maskTitle(title) {
  const trimmed = String(title ?? '').trim();
  if (!trimmed) return 'Complaint';
  return trimmed
    .split(/\s+/)
    .map((part) => maskWord(part, Math.min(2, part.length)))
    .join(' ');
}

module.exports = {
  ALLOWED_STATUSES,
  ADMIN_UI_STATUSES,
  generateComplaintId,
  parseImagePaths,
  maskPersonName,
  maskMobile,
  maskTitle,
};
