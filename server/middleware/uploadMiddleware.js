const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');

const imagesUploadDir = path.join(env.uploadsDir, 'images');
fs.mkdirSync(imagesUploadDir, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniqueSuffix}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
    const err = new Error('Only JPG, JPEG, PNG images are allowed');
    err.statusCode = 400;
    return cb(err);
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: env.maxFiles,
  },
});

const uploadComplaintImages = upload.fields([
  { name: 'images[]', maxCount: env.maxFiles },
  { name: 'images', maxCount: env.maxFiles },
]);

function collectUploadedFiles(req) {
  if (!req.files) return [];
  const bracketFiles = Array.isArray(req.files['images[]']) ? req.files['images[]'] : [];
  const plainFiles = Array.isArray(req.files.images) ? req.files.images : [];
  return [...bracketFiles, ...plainFiles].slice(0, env.maxFiles);
}

async function cleanupUploadedFiles(files = []) {
  await Promise.all(
    files.map((file) =>
      fs.promises.unlink(file.path).catch(() => {
        // Ignore cleanup errors if file was already removed.
      })
    )
  );
}

/**
 * Inspects actual binary magic bytes to ensure uploaded files are genuine JPEG or PNG images.
 */
function detectImageTypeFromBuffer(buffer) {
  if (!buffer || buffer.length < 8) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  return null;
}

async function validateImageFileContent(filePath, filename) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    if (bytesRead < 8) return false;

    const detected = detectImageTypeFromBuffer(buffer);
    if (!detected) return false;

    const ext = path.extname(filename || '').toLowerCase();
    if (detected === 'jpeg') return ext === '.jpg' || ext === '.jpeg';
    if (detected === 'png') return ext === '.png';
    return false;
  } finally {
    await handle.close();
  }
}

async function verifyUploadedImageContents(req, res, next) {
  const uploadedFiles = collectUploadedFiles(req);
  if (uploadedFiles.length === 0) {
    return next();
  }

  try {
    for (const file of uploadedFiles) {
      const isValid = await validateImageFileContent(file.path, file.filename);
      if (!isValid) {
        await cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({
          status: 'error',
          message: 'Only valid JPG, JPEG, PNG image files are allowed',
        });
      }
    }
    return next();
  } catch (err) {
    await cleanupUploadedFiles(uploadedFiles);
    return next(err);
  }
}

module.exports = {
  uploadComplaintImages,
  verifyUploadedImageContents,
  collectUploadedFiles,
  cleanupUploadedFiles,
  detectImageTypeFromBuffer,
  validateImageFileContent,
};
