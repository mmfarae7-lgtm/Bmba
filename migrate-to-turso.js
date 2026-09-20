// Usage (from the app folder):
//   $env:TURSO_DATABASE_URL="libsql://<db>-<org>.turso.io"
//   $env:TURSO_AUTH_TOKEN="eyJ..."
//   node migrate-to-turso.js
const { createClient } = require('@libsql/client');
const path = require('path');

const REMOTE_URL = process.env.TURSO_DATABASE_URL;
const TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!REMOTE_URL || !TOKEN) {
  console.error('ERROR: Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first.');
  process.exit(1);
}

const local = createClient({ url: 'file:' + path.join(process.cwd(), 'bomba.db') });
const db = require('./lib/db'); // uses TURSO_DATABASE_URL env -> remote client
const remote = db.client;

const TABLES = ['users', 'leagues', 'matches', 'predictions', 'favorites', 'point_logs', 'messages', 'settings'];

async function truncate() {
  const order = ['predictions', 'favorites', 'point_logs', 'messages', 'matches', 'leagues', 'users', 'settings'];
  for (const t of order) {
    await remote.execute(`DELETE FROM ${t}`);
  }
  console.log('remote tables cleared');
}

async function copyTable(name) {
  const rows = (await local.execute(`SELECT * FROM ${name}`)).rows;
  if (rows.length === 0) {
    console.log(`${name}: 0 rows (skip)`);
    return;
  }
  const cols = Object.keys(rows[0]);
  const pk = cols.includes('id') ? 'id' : cols.includes('key') ? 'key' : null;
  const nonPk = pk ? cols.filter((c) => c !== pk) : cols;
  const allCols = pk ? [pk, ...nonPk] : cols;
  const colSql = allCols.map((c) => `"${c}"`).join(', ');
  const ph = allCols.map(() => '?').join(', ');
  const insertSql = `INSERT OR REPLACE INTO ${name} (${colSql}) VALUES (${ph})`;
  let done = 0;
  for (const row of rows) {
    const vals = allCols.map((c) => (row[c] === undefined ? null : row[c]));
    try {
      await remote.execute({ sql: insertSql, args: vals });
      done++;
    } catch (e) {
      console.error(`${name} ${pk}=${row[pk]} error: ${e.message}`);
    }
  }
  console.log(`${name}: copied ${done}/${rows.length}`);
}

(async () => {
  await db.ensureInit(); // creates schema on remote
  console.log('remote schema ensured:', REMOTE_URL.replace(/\/\/.*@/, '//***@'));
  await truncate();
  for (const t of TABLES) {
    await copyTable(t);
  }
  const counts = {};
  for (const t of TABLES) {
    counts[t] = (await remote.execute(`SELECT COUNT(*) as c FROM ${t}`)).rows[0].c;
  }
  console.log('FINAL COUNTS:', JSON.stringify(counts));
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });