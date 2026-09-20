// منح هدية الاشتراك (100 بمبا) للأعضاء الحاليين الذين لم يحصلوا عليها
// يعمل على قاعدة البيانات المحلية و على قاعدة البيانات السحابية (Turso / الإنتاج)
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const WELCOME = 100;

function loadEnv() {
  const env = {};
  try {
    const raw = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      env[m[1]] = v;
    }
  } catch {}
  return env;
}

async function backfill(label, client) {
  const users = (
    await client.execute({
      sql: `SELECT u.id FROM users u
            LEFT JOIN rewards_claims rc ON rc.user_id = u.id AND rc.action = 'welcome'
            WHERE rc.id IS NULL`,
    })
  ).rows;
  let done = 0;
  for (const u of users) {
    await client.execute({
      sql: 'UPDATE users SET bombs = bombs + ? WHERE id = ?',
      args: [WELCOME, u.id],
    });
    await client.execute({
      sql: "INSERT OR IGNORE INTO rewards_claims (user_id, action, day, bombs) VALUES (?, 'welcome', '1', ?)",
      args: [u.id, WELCOME],
    });
    done++;
  }
  const total = (await client.execute('SELECT COUNT(*) AS c FROM users')).rows[0].c;
  console.log(`${label}: تم منح 100 بمبا لـ ${done} عضو (من أصل ${total})`);
}

(async () => {
  // 1) القاعدة المحلية
  const local = createClient({ url: 'file:' + path.join(process.cwd(), 'bomba.db') });
  await backfill('محلي (bomba.db)', local);

  // 2) القاعدة السحابية (الإنتاج)
  const env = loadEnv();
  if (env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN) {
    const remote = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
    await backfill('سحابي (Turso — الإنتاج)', remote);
  } else {
    console.log('لا توجد بيانات Turso في .env.local — تم التخطي');
  }
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});