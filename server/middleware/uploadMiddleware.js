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

module.exports = {
  uploadComplaintImages,
  collectUploadedFiles,
  cleanupUploadedFiles,
};

