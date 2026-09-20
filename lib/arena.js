// ربط مباريات الحلبة: مباريات حقيقية من API المباريات لكن خاصة بكل حلبة
// (لا تُضاف إلى التوقعات العامة — توقعات الحلبة تُحفظ في arena_predictions فقط)
const db = require('./db');

const DEFAULT_LIMIT = 20;

// اختيار أقرب المباريات القادمة الحقيقية (من الـ API إن كانت مفعّلة)
async function pickUpcomingMatches(limit = DEFAULT_LIMIT) {
  const existing = await db.prepare(`
    SELECT COUNT(*) as c FROM matches WHERE status NOT IN ('finished', 'live')
  `).get();
  // نزامن فقط إذا كانت المباريات شحيحة (لتفادي استهلاك رصيد الـ API عند كل إنشاء)
  if (!existing || existing.c < 10) {
    const sports = require('./sports-api');
    try {
      if (await sports.isEnabled()) await sports.syncWeek();
    } catch (e) {
      // نتجاهل أخطاء المزامنة ونعتمد على المباريات الموجودة
    }
  }
  const rows = await db.prepare(`
    SELECT id FROM matches
    WHERE status != 'finished' AND status != 'live'
    ORDER BY (source = 'api') DESC, match_date, match_time
    LIMIT ?
  `).all(limit);
  return rows.map((r) => r.id);
}

// ربط مباريات قادمة بالحلبة (متكرر الأمان: INSERT OR IGNORE)
async function attachArenaMatches(arenaId, limit = DEFAULT_LIMIT) {
  const ids = await pickUpcomingMatches(limit);
  let count = 0;
  for (const matchId of ids) {
    const r = await db.prepare(
      'INSERT OR IGNORE INTO arena_matches (arena_id, match_id) VALUES (?, ?)'
    ).run(arenaId, matchId);
    if (r.changes > 0) count++;
  }
  return count;
}

// جلب مباريات الحلبة المرتبطة فقط (خاصة بالحلبة وليست العامة)
async function arenaMatches(arenaId) {
  const rows = await db.prepare(`
    SELECT m.*, l.name as league_name, l.logo_url as league_logo
    FROM arena_matches am
    JOIN matches m ON m.id = am.match_id
    LEFT JOIN leagues l ON l.id = m.league_id
    WHERE am.arena_id = ?
    ORDER BY m.match_date, m.match_time
  `).all(arenaId);
  return rows;
}

// التأكد أن المباراة مرتبطة بالحلبة فعلاً
async function isArenaMatch(arenaId, matchId) {
  const row = await db.prepare(
    'SELECT id FROM arena_matches WHERE arena_id = ? AND match_id = ?'
  ).get(arenaId, matchId);
  return !!row;
}

module.exports = { attachArenaMatches, arenaMatches, isArenaMatch, pickUpcomingMatches };