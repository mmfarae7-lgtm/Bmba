const { createClient } = require('@libsql/client');
const URL = process.env.TURSO_DATABASE_URL;
const TK = process.env.TURSO_AUTH_TOKEN;
const remote = createClient({ url: URL, authToken: TK });
(async () => {
  const m = await remote.execute({
    sql: `SELECT m.home_team, m.away_team, l.name as league, m.match_date, m.match_time, m.status, m.counts, m.fire
          FROM matches m LEFT JOIN leagues l ON m.league_id = l.id ORDER BY l.priority, m.match_time`,
  });
  console.log('remote matches:', m.rows.length);
  for (const r of m.rows) console.log('-', r.league, r.home_team, 'vs', r.away_team, r.match_date, r.match_time, r.status);
  const u = await remote.execute(`SELECT id, name, phone, role FROM users ORDER BY id`);
  console.log('users:', JSON.stringify(u.rows));
  const s = await remote.execute(`SELECT key, substr(value,1,40) as value FROM settings`);
  console.log('settings:', JSON.stringify(s.rows));
  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });