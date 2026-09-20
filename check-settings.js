const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const { createClient } = require('@libsql/client');
async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  const envKey = (process.env.SPORTS_API_KEY || '').trim();
  console.log('TURSO_URL:', url ? url.replace(/libsql:\/\//, '') : '(missing)');
  console.log('SPORTS_API_KEY in env:', envKey ? 'set(len=' + envKey.length + ')' : '(not set)');
  const c = createClient({ url, authToken: token });
  const r1 = await c.execute("SELECT key, value FROM settings WHERE key IN ('sports_api_key','sports_api_enabled','sports_api_last_error','show_leagues','sports_api_remaining')");
  for (const row of r1.rows) {
    if (row.key === 'sports_api_key') {
      console.log(row.key, 'len=' + row.value.length, 'head=' + String(row.value).slice(0, 4) + '...' + String(row.value).slice(-4), 'envMatches=' + (envKey && row.value === envKey));
    } else {
      console.log(row.key, JSON.stringify(row.value));
    }
  }
  const r2 = await c.execute("SELECT count(*) as cnt FROM matches");
  console.log('matches in turso:', r2.rows[0].cnt);
  const r3 = await c.execute("SELECT match_date, count(*) as c FROM matches GROUP BY match_date ORDER BY match_date DESC LIMIT 5");
  console.table(r3.rows);
  await c.close();
}
main().catch((e) => { console.error(e); process.exit(1); });