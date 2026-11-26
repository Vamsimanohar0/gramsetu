const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'gramsetu-dev-only-secret-change-in-prod');

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable must be configured in production.');
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vgmp',
  },
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieName: process.env.COOKIE_NAME || 'gramsetu_token',
  uploadsDir: path.resolve(__dirname, '..', 'uploads'),
  maxFileSizeBytes: (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024,
  maxFiles: Number(process.env.MAX_FILES) || 6,
};

