const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { testConnection } = require('./config/db');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.clientOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded complaint evidence files from server/uploads.
app.use('/uploads', express.static(env.uploadsDir));

app.get('/test', (_req, res) => {
  res.json({ status: 'ok', message: 'GramSetu backend is running' });
});

app.get('/api/health', async (_req, res) => {
  try {
    await testConnection();
    return res.json({ status: 'ok', database: 'connected' });
  } catch {
    return res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

app.use(errorHandler);

module.exports = app;

