const multer = require('multer');
const env = require('../config/env');

const DB_ERROR_CODES = new Set([
  'ER_ACCESS_DENIED_ERROR',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ER_BAD_DB_ERROR',
  'PROTOCOL_CONNECTION_LOST',
]);

function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: `Each image must be smaller than ${Math.round(env.maxFileSizeBytes / (1024 * 1024))} MB.`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: `Maximum ${env.maxFiles} images allowed`,
      });
    }
    return res.status(400).json({
      status: 'error',
      message: err.message || 'File upload failed.',
    });
  }

  if (DB_ERROR_CODES.has(err.code)) {
    if (env.nodeEnv !== 'test') {
      console.error('[GramSetu DB Error]', err.code, err.message);
    }
    return res.status(503).json({
      status: 'error',
      message:
        'Database connection failed. Please ensure MySQL is running and verify DB settings in server/.env.',
    });
  }

  if (
    err.code === 'ER_NO_SUCH_TABLE' ||
    err.errno === 1146 ||
    err.code === 'ER_BAD_FIELD_ERROR' ||
    err.errno === 1054
  ) {
    if (env.nodeEnv !== 'test') {
      console.error('[GramSetu Schema Error]', err.code, err.message);
    }
    return res.status(503).json({
      status: 'error',
      message:
        'Database schema update required. Please ensure all SQL migrations in database/migrations/ have been applied.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 && env.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (statusCode >= 500 && env.nodeEnv !== 'test') {
    console.error('[GramSetu API Error]', err);
  }

  return res.status(statusCode).json({
    status: 'error',
    message,
  });
}

module.exports = errorHandler;
