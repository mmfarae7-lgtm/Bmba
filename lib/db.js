const { createClient } = require('@libsql/client');
const path = require('path');
const bcrypt = require('bcryptjs');

const urlRaw = process.env.TURSO_DATABASE_URL;
const validUrl =
  urlRaw && /^(https?|libsql|file):\/\//i.test(urlRaw) ? urlRaw : null;
const url = validUrl || ('file:' + path.join(process.cwd(), 'bomba.db'));
const authToken = process.env.TURSO_AUTH_TOKEN;
const isFileDb = String(url).startsWith('file:');

const client = createClient({ url, authToken });

let initPromise = null;

async function init() {
  if (isFileDb) {
    await client.execute('PRAGMA busy_timeout = 10000');
    await client.execute('PRAGMA journal_mode = WAL');
    await client.execute('PRAGMA foreign_keys = ON');
  }

  for (const stmt of [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'superadmin')),
      blocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT,
      logo_url TEXT,
      api_id INTEGER,
      priority INTEGER DEFAULT 9999
    );`,
    `CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league_id INTEGER,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_logo TEXT,
      away_logo TEXT,
      match_date TEXT NOT NULL,
      match_time TEXT,
      status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'live', 'finished')),
      home_score INTEGER DEFAULT 0,
      away_score INTEGER DEFAULT 0,
      minute TEXT,
      api_id TEXT,
      source TEXT DEFAULT 'manual',
      counts INTEGER DEFAULT 0,
      fire INTEGER DEFAULT 0,
      points_value INTEGER DEFAULT 0,
      custom_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (league_id) REFERENCES leagues(id)
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      points_earned INTEGER DEFAULT 0,
      unique_bonus INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      room TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    `CREATE TABLE IF NOT EXISTS point_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT,
      admin_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );`,
    `CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );`,
    `CREATE TABLE IF NOT EXISTS rewards_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      day TEXT NOT NULL,
      bombs INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, action, day),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    `CREATE TABLE IF NOT EXISTS arenas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      owner_id INTEGER NOT NULL,
      tag TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS arena_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arena_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(arena_id, user_id),
      FOREIGN KEY (arena_id) REFERENCES arenas(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS arena_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arena_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(arena_id, user_id, match_id),
      FOREIGN KEY (arena_id) REFERENCES arenas(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS champion_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      league TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category, league),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS champion_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      league TEXT NOT NULL,
      winner TEXT NOT NULL,
      award_bombs INTEGER DEFAULT 0,
      settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, league)
    );`,
    `CREATE TABLE IF NOT EXISTS champion_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      league TEXT NOT NULL,
      bombs INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category, league),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS store_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      icon TEXT DEFAULT '🎁',
      description TEXT DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      type TEXT DEFAULT 'item',
      value INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS store_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      club TEXT NOT NULL,
      position TEXT NOT NULL CHECK(position IN ('GK','DEF','MID','FWD')),
      league TEXT NOT NULL,
      market_value_m INTEGER DEFAULT 0,
      price_bombs INTEGER DEFAULT 0,
      photo TEXT DEFAULT '',
      active INTEGER DEFAULT 1
    );`,
    `CREATE TABLE IF NOT EXISTS coach_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      team_name TEXT NOT NULL,
      league TEXT NOT NULL,
      budget INTEGER DEFAULT 20000,
      captain_player_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS coach_squad (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      bought_price INTEGER DEFAULT 0,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, player_id),
      FOREIGN KEY (team_id) REFERENCES coach_teams(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS coach_week_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week, player_id),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS coach_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      week INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('buy','sell')),
      player_id INTEGER NOT NULL,
      price INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES coach_teams(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS coach_week_settles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week INTEGER UNIQUE NOT NULL,
      settled_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_api ON matches(api_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_api ON leagues(api_id);`,
  ]) {
    await client.execute(stmt);
  }

  async function addColumn(table, column, def) {
    const rows = (await client.execute(`PRAGMA table_info(${table})`)).rows;
    if (!rows.find((c) => c.name === column)) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    }
  }

  await addColumn('leagues', 'api_id', 'INTEGER');
  await addColumn('leagues', 'priority', 'INTEGER DEFAULT 9999');
  await addColumn('matches', 'api_id', 'TEXT');
  await addColumn('matches', 'source', "TEXT DEFAULT 'manual'");
  await addColumn('matches', 'counts', 'INTEGER DEFAULT 0');
  await addColumn('matches', 'fire', 'INTEGER DEFAULT 0');
  await addColumn('matches', 'points_value', 'INTEGER DEFAULT 0');
  await addColumn('matches', 'custom_points', 'INTEGER DEFAULT 0');
  await addColumn('matches', 'featured', 'INTEGER DEFAULT 0');
  await addColumn('predictions', 'unique_bonus', 'INTEGER DEFAULT 0');
  await addColumn('users', 'email', 'TEXT');
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);
  await addColumn('users', 'avatar', 'TEXT');
  await addColumn('users', 'phone_code', 'TEXT');
  await addColumn('users', 'country', 'TEXT');
  await addColumn('users', 'gender', 'TEXT');
  await addColumn('users', 'birth_date', 'TEXT');
  await addColumn('users', 'bombs', 'INTEGER DEFAULT 0');
  await addColumn('users', 'invite_code', 'TEXT');
  await addColumn('users', 'invited_by', 'TEXT');
  await addColumn('users', 'notifications', 'INTEGER DEFAULT 1');
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code)`);

  const admins = (await client.execute(`SELECT id FROM users WHERE role = 'superadmin'`)).rows;
  if (admins.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (name, phone, password, role, points) VALUES (?, ?, ?, ?, ?)`,
      args: ['المدير', '7777777', hash, 'superadmin', 0],
    });
  }

  const lc = (await client.execute('SELECT COUNT(*) as count FROM leagues')).rows[0].count;
  if (lc === 0) {
    const leagues = [
      ['الدوري الإنجليزي الممتاز', 'England', 39, 10],
      ['الدوري الإسباني', 'Spain', 140, 11],
      ['الدوري الإيطالي', 'Italy', 135, 12],
      ['الدوري الألماني', 'Germany', 78, 13],
      ['الدوري الفرنسي', 'France', 61, 14],
      ['دوري أبطال أوروبا', 'Europe', 2, 2],
      ['الدوري الأوروبي', 'Europe', 3, 3],
      ['دوري روشن السعودي', 'Saudi Arabia', 307, 15],
      ['دوري أبطال آسيا', 'Asia', 5, 5],
      ['كأس العالم', 'World', 1, 1],
    ];
    for (const [name, country, apiId, priority] of leagues) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO leagues (name, country, api_id, priority) VALUES (?, ?, ?, ?)`,
        args: [name, country, apiId, priority],
      });
    }
  }

  const sampleNames = ['مانشستر سيتي', 'آرسنال', 'ريال مدريد', 'يوفنتوس', 'بايرن ميونخ', 'الهلال', 'باريس سان جيرمان'];
  await client.execute({
    sql: `UPDATE matches SET source = 'sample' WHERE home_team IN (${sampleNames.map(() => '?').join(',')})`,
    args: sampleNames,
  });

  const storeCount = (await client.execute('SELECT COUNT(*) as count FROM store_items')).rows[0].count;
  if (storeCount === 0) {
    const items = [
      ['💎 1000 بمبا', 'بمبات فورية تُضاف لرصيدك', 900, 'bombs', 1000],
      ['⚡ 500 بمبا', 'بمبات فورية تُضاف لرصيدك', 450, 'bombs', 500],
      ['🔥 مباراة نارية مجانية', 'اجعل أي مباراة نارية لمنزلك (يُفعّل يدوياً)', 800, 'item', 0],
      ['👑 لقب خاص بجانب اسمك', 'لقب مميز يظهر بجانب اسمك في الترتيب', 1500, 'item', 0],
      ['🛡️ حماية توقع', 'توقع مُحصّن من الخسارة (يُفعّل يدوياً)', 1200, 'item', 0],
      ['🎨 ثيم خاص', 'ثيم خاص لواجهة حسابك', 600, 'item', 0],
    ];
    for (const [title, desc, price, type, value] of items) {
      await client.execute({ sql: `INSERT INTO store_items (title, description, price, type, value) VALUES (?, ?, ?, ?, ?)`, args: [title, desc, price, type, value] });
    }
  }

  const playerCount = (await client.execute('SELECT COUNT(*) as count FROM players')).rows[0].count;
  if (playerCount === 0) {
    const P = (name, club, position, league, market_value_m) =>
      [name, club, position, league, market_value_m, market_value_m * 10];
    const pl = [
      // الدوري الإنجليزي
      P('إيرلينغ هالاند', 'مانشستر سيتي', 'FWD', 'EPL', 180),
      P('فيل فودن', 'مانشستر سيتي', 'MID', 'EPL', 130),
      P('رودري', 'مانشستر سيتي', 'MID', 'EPL', 120),
      P('بوكايو ساكا', 'آرسنال', 'FWD', 'EPL', 150),
      P('مارتين أوديغارد', 'آرسنال', 'MID', 'EPL', 90),
      P('ديكلان رايس', 'آرسنال', 'MID', 'EPL', 110),
      P('ويلليام ساليبا', 'آرسنال', 'DEF', 'EPL', 90),
      P('محمد صلاح', 'ليفربول', 'FWD', 'EPL', 120),
      P('فيرجيل فان دايك', 'ليفربول', 'DEF', 'EPL', 45),
      P('أليسون بيكر', 'ليفربول', 'GK', 'EPL', 40),
      P('كول بالمر', 'تشيلسي', 'FWD', 'EPL', 130),
      P('إينزو فيرنانديز', 'تشيلسي', 'MID', 'EPL', 90),
      P('مويسيس كايسيدو', 'تشيلسي', 'MID', 'EPL', 90),
      P('هنري جورجسون', 'تشيلسي', 'GK', 'EPL', 25),
      P('ألكسندر إيساك', 'نيوكاسل', 'FWD', 'EPL', 100),
      P('برونو غيمارايش', 'نيوكاسل', 'MID', 'EPL', 85),
      P('نيك بوب', 'نيوكاسل', 'GK', 'EPL', 30),
      P('سون هيونغ-مين', 'توتنهام', 'FWD', 'EPL', 45),
      P('جيمس ماديسون', 'توتنهام', 'MID', 'EPL', 70),
      P('ديان كولوسيفسكي', 'توتنهام', 'FWD', 'EPL', 70),
      // الدوري الإسباني
      P('فينيسيوس جونيور', 'ريال مدريد', 'FWD', 'LIGA', 200),
      P('جود بيلينغهام', 'ريال مدريد', 'MID', 'LIGA', 180),
      P('كيليان مبابي', 'ريال مدريد', 'FWD', 'LIGA', 180),
      P('تيبو كورتوا', 'ريال مدريد', 'GK', 'LIGA', 35),
      P('إيدير ميليتاو', 'ريال مدريد', 'DEF', 'LIGA', 40),
      P('لامين يامال', 'برشلونة', 'FWD', 'LIGA', 180),
      P('روبرت ليفاندوفسكي', 'برشلونة', 'FWD', 'LIGA', 40),
      P('بيدري', 'برشلونة', 'MID', 'LIGA', 120),
      P('غافي', 'برشلونة', 'MID', 'LIGA', 100),
      P('رونالد أراوخو', 'برشلونة', 'DEF', 'LIGA', 80),
      P('جوليان ألفاريز', 'أتلتيكو مدريد', 'FWD', 'LIGA', 90),
      P('أنتوان غريزمان', 'أتلتيكو مدريد', 'FWD', 'LIGA', 55),
      P('بابلو باريوس', 'أتلتيكو مدريد', 'MID', 'LIGA', 50),
      P('أوناي سيمون', 'أتلتيكو بيلباو', 'GK', 'LIGA', 40),
      P('إيناكي ويليامز', 'أتلتيكو بيلباو', 'FWD', 'LIGA', 60),
      P('نيكو ويليامز', 'أتلتيكو بيلباو', 'FWD', 'LIGA', 70),
      P('هيوسي كونسا', 'فالنسيا', 'DEF', 'LIGA', 35),
      // دوري روشن السعودي
      P('كرستيانو رونالدو', 'النصر', 'FWD', 'SAU', 30),
      P('ساديو ماني', 'النصر', 'FWD', 'SAU', 35),
      P('أوتافيو', 'النصر', 'MID', 'SAU', 25),
      P('عبدالرزاق حمدالله', 'الشباب', 'FWD', 'SAU', 30),
      P('رومان سايس', 'الشباب', 'DEF', 'SAU', 20),
      P('فاليرمان', 'الشباب', 'GK', 'SAU', 20),
      P('سالم الدوسري', 'الهلال', 'MID', 'SAU', 25),
      P('علي البليهي', 'الهلال', 'DEF', 'SAU', 10),
      P('ماركوس ليوناردو', 'الهلال', 'FWD', 'SAU', 40),
      P('رياض محرز', 'الأهلي', 'FWD', 'SAU', 20),
      P('فرانك كيسي', 'الأهلي', 'MID', 'SAU', 30),
      P('روجر إيبانيز', 'الأهلي', 'DEF', 'SAU', 18),
      P('غورجيوس دوربينا', 'الأهلي', 'GK', 'SAU', 12),
      P('كريم بنزيما', 'الاتحاد', 'FWD', 'SAU', 25),
      P('نغولو كانتي', 'الاتحاد', 'MID', 'SAU', 20),
      P('عبدالله المعيوف', 'الاتحاد', 'GK', 'SAU', 8),
      P('موسى ديابي', 'الاتحاد', 'FWD', 'SAU', 35),
    ];
    for (const row of pl) {
      await client.execute({ sql: `INSERT INTO players (name, club, position, league, market_value_m, price_bombs) VALUES (?, ?, ?, ?, ?, ?)`, args: row });
    }
  }

  // هدية الاشتراك (100 بمبا) للأعضاء القدامى — تُمنح لمرة واحدة لكل من لم يحصل عليها
  const noWelcome = (
    await client.execute({
      sql: `SELECT u.id FROM users u
            LEFT JOIN rewards_claims rc ON rc.user_id = u.id AND rc.action = 'welcome'
            WHERE rc.id IS NULL`,
    })
  ).rows;
  if (noWelcome.length > 0) {
    for (const u of noWelcome) {
      await client.execute({ sql: 'UPDATE users SET bombs = bombs + 100 WHERE id = ?', args: [u.id] });
      await client.execute({
        sql: "INSERT OR IGNORE INTO rewards_claims (user_id, action, day, bombs) VALUES (?, 'welcome', '1', 100)",
        args: [u.id],
      });
    }
  }
}

function ensureInit() {
  if (!initPromise) {
    initPromise = init().catch((e) => { initPromise = null; throw e; });
  }
  return initPromise;
}

function prepare(sql) {
  return {
    async get(...args) {
      await ensureInit();
      const r = await client.execute({ sql, args });
      return r.rows[0] ?? null;
    },
    async all(...args) {
      await ensureInit();
      const r = await client.execute({ sql, args });
      return r.rows;
    },
    async run(...args) {
      await ensureInit();
      const r = await client.execute({ sql, args });
      return {
        changes: r.rowsAffected ?? 0,
        lastInsertRowid: r.lastInsertRowid ? Number(r.lastInsertRowid) : 0,
      };
    },
  };
}

module.exports = { prepare, client, ensureInit, init };