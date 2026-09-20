const { createClient } = require('@libsql/client');

const db = createClient({ url: 'file:./bomba.db' });
const rows = db.execute({ sql: "SELECT id, name FROM leagues WHERE id IN (17,1,2,3,4,5,97) ORDER BY id" });
rows.then(r => {
  console.log('LOCAL leagues:');
  for (const row of r.rows) {
    console.log(' ', row.id, JSON.stringify(row.name));
  }
});

const remote = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
remote.execute({ sql: "SELECT id, name FROM leagues WHERE id IN (17,1,2,3,4,5,97) ORDER BY id" }).then(r => {
  console.log('REMOTE leagues:');
  for (const row of r.rows) {
    console.log(' ', row.id, JSON.stringify(row.name));
  }
});