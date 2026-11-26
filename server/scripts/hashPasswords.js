/**
 * Non-destructive utility script to hash any legacy plaintext passwords in `panchayaths`.
 * Existing bcrypt hashes ($2a$, $2b$, $2y$) are skipped untouched.
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { isBcryptHash } = require('../services/authService');

async function run() {
  try {
    const [rows] = await pool.execute('SELECT id, username, password FROM panchayaths');
    let updatedCount = 0;

    for (const row of rows) {
      if (!isBcryptHash(row.password)) {
        const hashed = await bcrypt.hash(String(row.password), 10);
        await pool.execute('UPDATE panchayaths SET password = ? WHERE id = ?', [hashed, row.id]);
        console.log(`Hashed password for panchayath "${row.username}" (id=${row.id})`);
        updatedCount += 1;
      }
    }

    console.log(`Done. Updated ${updatedCount} row(s).`);
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Failed to hash passwords:', err.message);
  process.exit(1);
});

