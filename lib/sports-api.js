const db = require('./db');
const { calculatePointsForMatch } = require('./points');

const BASE = process.env.SPORTS_API_BASE || 'https://v3.football.api-sports.io';

const cache = new Map();

async function getSetting(key) {
  const r = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r ? r.value : null;
}

async function setSetting(key, value) {
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

async function isEnabled() {
  return !!(await getSetting('sports_api_key')) && (await getSetting('sports_api_enabled')) === '1';
}

async function getStatus() {
  return {
    enabled: await isEnabled(),
    has_key: !!(await getSetting('sports_api_key')),
    remaining: await getSetting('sports_api_remaining'),
    last_success: await getSetting('sports_api_last_success'),
    last_error: await getSetting('sports_api_last_error'),
    last_sync_at: await getSetting('sports_api_last_sync'),
    last_sync_count: (await getSetting('sports_api_last_sync_count')) || '0',
  };
}

async function setError(msg) {
  await setSetting('sports_api_last_error', msg);
}

function cachedGet(cacheKey, ttlMs, fetcher) {
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.expires) return Promise.resolve(hit.data);
  return Promise.resolve(fetcher()).then((data) => {
    cache.set(cacheKey, { expires: Date.now() + ttlMs, data });
    return data;
  });
}

async function apiGet(path) {
  const key = await getSetting('sports_api_key');
  if (!key) throw new Error('المفتاح غير مضبوط');
  let res;
  try {
    res = await fetch(BASE + path, { headers: { 'x-apisports-key': key } });
  } catch (e) {
    await setError('تعذر الاتصال بـ API-Football');
    throw e;
  }
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining) await setSetting('sports_api_remaining', String(remaining));
  if (!res.ok) {
    const msg = `HTTP ${res.status}`;
    await setError(msg);
    throw new Error(msg);
  }
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    const msg = String(Object.values(json.errors)[0]);
    await setError(msg);
    throw new Error(msg);
  }
  await setSetting('sports_api_last_success', new Date().toISOString());
  await setSetting('sports_api_last_error', '');
  return json;
}

function mapStatus(apiStatus) {
  const finished = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
  const live = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
  if (finished.includes(apiStatus)) return 'finished';
  if (live.includes(apiStatus)) return 'live';
  return 'upcoming';
}

function timeInRiyadh(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh',
  });
}

function dateInRiyadh(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

// أولوية العرض: أصغر رقم = يظهر أولاً (الأقوى ثم الدولية)
// 1-9: البطولات الدولية الكبرى
// 10-29: الدوريات الخمسة الكبرى + أقوى الدوريات
// 30+: باقي الدوريات
const LEAGUES_META = {
  1:   { name: 'كأس العالم', priority: 1 },
  2:   { name: 'دوري أبطال أوروبا', priority: 2 },
  3:   { name: 'الدوري الأوروبي', priority: 3 },
  4:   { name: 'دوري المؤتمر الأوروبي', priority: 4 },
  5:   { name: 'كأس الاتحاد الآسيوي', priority: 5 },
  17:  { name: 'دوري أبطال آسيا النخبة', priority: 6 },
  6:   { name: 'كأس الاتحاد الآسيوي', priority: 7 },
  13:  { name: 'كوبا ليبرتادوريس', priority: 6 },
  14:  { name: 'كوبا سودأمريكانا', priority: 7 },
  15:  { name: 'كأس العالم للأندية', priority: 8 },
  39:  { name: 'الدوري الإنجليزي الممتاز', priority: 10 },
  140: { name: 'الدوري الإسباني', priority: 11 },
  135: { name: 'الدوري الإيطالي', priority: 12 },
  78:  { name: 'الدوري الألماني', priority: 13 },
  61:  { name: 'الدوري الفرنسي', priority: 14 },
  307: { name: 'دوري روشن السعودي', priority: 15 },
  308: { name: 'دوري يلو السعودي (الأولى)', priority: 16 },
  504: { name: 'كأس خادم الحرمين الشريفين', priority: 32 },
  826: { name: 'كأس السوبر السعودي', priority: 31 },
  94:  { name: 'الدوري البرتغالي', priority: 20 },
  88:  { name: 'الدوري الهولندي', priority: 21 },
  144: { name: 'الدوري البلجيكي', priority: 22 },
  71:  { name: 'الدوري البرازيلي', priority: 23 },
  128: { name: 'الدوري الأرجنتيني', priority: 24 },
  253: { name: 'الدوري الأمريكي MLS', priority: 25 },
  203: { name: 'الدوري التركي', priority: 26 },
  197: { name: 'الدوري اليوناني', priority: 27 },
  262: { name: 'الدوري المكسيكي', priority: 28 },
  333: { name: 'الدوري الاسكتلندي', priority: 29 },
  345: { name: 'الدوري المصري', priority: 30 },
  179: { name: 'الدوري النمساوي', priority: 31 },

  18:  { name: 'دوري أبطال أفريقيا', priority: 33 },
  1079: { name: 'دوري اليمن', priority: 34 },
  };

function leagueMeta(id) {
  return LEAGUES_META[id] || { name: null, priority: 9999 };
}

async function upsertLeague(lg) {
  const meta = leagueMeta(lg.id);
  const name = meta.name || lg.name;
  return db.prepare(`
    INSERT INTO leagues (api_id, name, country, logo_url, priority)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(api_id) DO UPDATE SET
      name = excluded.name, country = excluded.country, logo_url = excluded.logo_url, priority = excluded.priority
    RETURNING id
  `).get(lg.id, name, lg.country || '', lg.logo || '', meta.priority);
}

async function upsertFixture(fix) {
  const league = await upsertLeague(fix.league);
  const status = mapStatus(fix.fixture.status.short);
  const old = await db.prepare('SELECT * FROM matches WHERE api_id = ?').get(String(fix.fixture.id));

  await db.prepare(`
    INSERT INTO matches (api_id, league_id, home_team, away_team, home_logo, away_logo,
      match_date, match_time, status, home_score, away_score, minute, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'api')
    ON CONFLICT(api_id) DO UPDATE SET
      league_id = excluded.league_id, home_team = excluded.home_team, away_team = excluded.away_team,
      home_logo = excluded.home_logo, away_logo = excluded.away_logo,
      match_date = excluded.match_date, match_time = excluded.match_time,
      status = excluded.status, home_score = excluded.home_score,
      away_score = excluded.away_score, minute = excluded.minute
  `).run(
    String(fix.fixture.id), league.id, fix.teams.home.name, fix.teams.away.name,
    fix.teams.home.logo || '', fix.teams.away.logo || '',
    dateInRiyadh(fix.fixture.date), timeInRiyadh(fix.fixture.date),
    status, fix.goals.home ?? 0, fix.goals.away ?? 0,
    fix.fixture.status.elapsed != null ? `م${fix.fixture.status.elapsed}` : ''
  );

  const row = await db.prepare('SELECT * FROM matches WHERE api_id = ?').get(String(fix.fixture.id));
  if (status === 'finished' && old && old.status !== 'finished') {
    await calculatePointsForMatch(row.id);
  }
  return row.id;
}

const DEFAULT_SHOWN = [
  1, 15,          // كأس العالم، كأس العالم للأندية
  2, 3, 4,        // أبطال أوروبا، الأوروبي، المؤتمر
  5, 17, 6,       // أبطال آسيا (النخبة)، كأس الاتحاد الآسيوي
  39, 140, 135, 78, 61,  // الخمسة الكبرى
  307, 308, 504, 826,  // السعودي: الممتاز، الأولى، كأس الملك، السوبر
  94,             // البرتغالي
  71,             // البرازيلي
  203,            // التركي
  1079,           // دوري اليمن
];

async function isShowAll() {
  return (await getSetting('show_leagues')) === '__all__';
}

async function getShownLeagues() {
  if (await isShowAll()) return null;
  const raw = await getSetting('show_leagues');
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {}
  }
  return DEFAULT_SHOWN;
}

async function pruneUnshown() {
  const shown = await getShownLeagues();
  if (!shown) return;
  const placeholders = shown.map(() => '?').join(',');
  const leagueRows = await db.prepare(`SELECT id FROM leagues WHERE api_id IN (${placeholders})`).all(...shown);
  const ids = leagueRows.map((r) => r.id);
  let bad;
  if (ids.length === 0) {
    bad = await db.prepare("SELECT id FROM matches WHERE source = 'api'").all();
  } else {
    const ph = ids.map(() => '?').join(',');
    bad = await db.prepare(`SELECT id FROM matches WHERE source = 'api' AND league_id NOT IN (${ph})`).all(...ids);
  }
  for (const m of bad) {
    await db.prepare('DELETE FROM predictions WHERE match_id = ?').run(m.id);
    await db.prepare('DELETE FROM favorites WHERE match_id = ?').run(m.id);
    await db.prepare('DELETE FROM matches WHERE id = ?').run(m.id);
  }
}

async function fetchFixtures(dateStr) {
  const json = await apiGet(`/fixtures?date=${dateStr}&timezone=Asia/Riyadh`);
  const list = json.response || [];
  const shown = await getShownLeagues();
  const shownSet = shown ? new Set(shown) : null;
  let count = 0;
  for (const fix of list) {
    if (shownSet && !shownSet.has(fix.league.id)) continue;
    await upsertFixture(fix);
    count++;
  }
  await pruneUnshown();
  if (count > 0) {
    await db.prepare("DELETE FROM matches WHERE source = 'sample' AND match_date = ?").run(dateStr);
  }
  await setSetting('sports_api_last_sync', new Date().toISOString());
  await setSetting('sports_api_last_sync_count', String(count));
  return count;
}

async function syncDate(dateStr) {
  return cachedGet('fixtures:' + dateStr, 20 * 60 * 1000, () => fetchFixtures(dateStr));
}

async function refreshLive() {
  const json = await apiGet('/fixtures?live=all&timezone=Asia/Riyadh');
  const list = json.response || [];
  for (const fix of list) {
    const status = mapStatus(fix.fixture.status.short);
    await db.prepare(`
      UPDATE matches SET status = ?, home_score = ?, away_score = ?, minute = ?
      WHERE api_id = ?
    `).run(status, fix.goals.home ?? 0, fix.goals.away ?? 0,
      fix.fixture.status.elapsed != null ? `م${fix.fixture.status.elapsed}` : '',
      String(fix.fixture.id));
    const row = await db.prepare('SELECT * FROM matches WHERE api_id = ?').get(String(fix.fixture.id));
    if (status === 'finished' && row && row.home_score !== null) {
      const preds = await db.prepare('SELECT id FROM predictions WHERE match_id = ? AND points_earned = 0').all(row.id);
      if (preds.length > 0) await calculatePointsForMatch(row.id);
    }
  }
}

async function refreshLiveCached() {
  return cachedGet('live', 75 * 1000, refreshLive);
}

async function ensureToday() {
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  return syncDate(dateStr);
}

async function syncNow() {
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  cache.delete('fixtures:' + dateStr);
  return fetchFixtures(dateStr);
}

async function syncWeek() {
  if (!(await isEnabled())) return { days: 0, total: 0 };
  const now = new Date();
  let total = 0;
  const days = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
    days.push(dateStr);
  }
  for (const dateStr of days) {
    try {
      cache.delete('fixtures:' + dateStr);
      const count = await fetchFixtures(dateStr);
      total += count;
    } catch (e) {
      // skip failed day, continue with others
    }
  }
  return { days: days.length, total };
}

module.exports = {
  isEnabled,
  getStatus,
  ensureToday,
  refreshLiveCached,
  syncNow,
  syncDate,
  syncWeek,
  clearCache: () => cache.clear(),
  getShownLeagues,
  isShowAll,
  DEFAULT_SHOWN,
  LEAGUES_META,
};