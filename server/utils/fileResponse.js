const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const IMAGES_DIR = path.resolve(env.uploadsDir, 'images');

/**
 * Safely resolves an evidence filename inside `uploads/images` and streams it
 * with private, no-store cache headers.
 */
async function sendProtectedEvidenceImage(res, requestedFilename, next) {
  try {
    const raw = String(requestedFilename || '');
    const safeName = path.basename(raw);
    if (!safeName || safeName !== raw || safeName.includes('..') || safeName.includes('\0')) {
      return res.status(400).json({ status: 'error', message: 'Invalid evidence filename' });
    }

    const resolved = path.resolve(IMAGES_DIR, safeName);
    if (!resolved.startsWith(`${IMAGES_DIR}${path.sep}`)) {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    try {
      await fs.promises.access(resolved, fs.constants.R_OK);
    } catch {
      return res.status(404).json({ status: 'error', message: 'Evidence file not found' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(resolved);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  sendProtectedEvidenceImage,
};

