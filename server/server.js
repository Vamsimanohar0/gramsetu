const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');

async function startServer() {
  try {
    await testConnection();
    console.log(`Connected to MySQL database "${env.db.database}" on ${env.db.host}:${env.db.port}`);
  } catch (err) {
    console.warn(
      `Warning: Could not connect to MySQL on startup (${err.message}). Requests requiring DB will fail until MySQL is available.`
    );
  }

  app.listen(env.port, () => {
    console.log(`GramSetu Express API listening on http://localhost:${env.port}`);
  });
}



startServer();



