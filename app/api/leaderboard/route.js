import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { TOURNAMENTS } = require('../../../lib/tournaments');

function periodStart(period) {
  const now = Date.now();
  if (period === 'weekly') return new Date(now - 7 * 86400000).toISOString();
  if (period === 'monthly') return new Date(now - 30 * 86400000).toISOString();
  return null所在的; // seasonal = كل الفترة
}

export async function GET(req) {
  const url = new URL(req.url);
  const section = url.searchParams.get('section') || 'general';
  const period = url.searchParams.get('period') || 'seasonal';
  const tournament = url.searchParams.get('tournament') || '';
  const q = (url.searchParams.get('q') || '').trim();

  const from = periodStart(period);

  const nameWhere = q ? ' AND u.name LIKE ?' : '';
  const nameArgs = q ? [`%${q}%`] : [];

  // ——— مليونيرات بمبا (عمولات بمبا) ———
  if (section === 'millionaires') {
    const rows = await db.prepare(`
      SELECT u.id, u.name, u.role, u.bombs
      FROM users u
      WHERE u.blocked = 0 AND u.bombs > 0${nameWhere}
      ORDER BY u.bombs DESC LIMIT 100
    `).all(...nameArgs);
    return NextResponse.json({ section: 'millionaires', list: rows });
  }

  // ——— قائمة الفائزين (نجمة الأسبوع والشهر) ———
  if (section === 'winners') {
    const star = async (days) => {
      const fromDate = new Date(Date.now() - days * 86400000).toISOString();
      const row = await db.prepare(`
        SELECT u.id, u.name, SUM(pl.points) as pts, COUNT(*) as cnt
        FROM point_logs pl JOIN users u ON u.id = pl.user_id
        WHERE u.blocked = 0 AND pl.points > 0 AND pl.created_at >= ?${nameWhere}
        GROUP BY u.id ORDER BY pts DESC LIMIT 1
      `).get(fromDate, ...nameArgs);
      return row ? { name: row.name, points: row.pts, count: row.cnt } : null;
    };
    const weekly = await star(7);
    const monthly = await star(30);
    return NextResponse.json({ section: 'winners', weekly, monthly });
  }

  // ——— الترتيب حسب البطولة ———
  if (section === 'tournament') {
    const t = TOURNAMENTS.find((x) => x.slug === tournament);
    if (!t || !t.ids || !t.ids.length) {
      const list = TOURNAMENTS.map((x) => ({ slug: x.slug, ar: x.ar, emoji: x.emoji })).slice(0, 50);
      return NextResponse.json({ section: 'tournament', tournaments: list, list: [] });
    }
    const ph = t.ids.map(() => '?').join(',');
    const rows = await db.prepare(`
      SELECT u.id, u.name, u.role,
             COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) as pts,
             COUNT(pl.id) as cnt
      FROM point_logs pl
      JOIN users u ON u.id = pl.user_id
      JOIN matches m ON m.id = pl.match_id
      JOIN leagues l ON l.id = m.league_id
      WHERE u.blocked = 0 AND l.api_id IN (${ph})${from ? ' AND pl.created_at >= ?' : ''}${nameWhere}
      GROUP BY u.id ORDER BY pts DESC LIMIT 100
    `).all(...t.ids, ...[from ? from : null].filter(Boolean), ...nameArgs);
    return NextResponse.json({ section: 'tournament', slug: t.slug, list: rows });
  }

  // ——— الترتيب العام ———
  const rows = await db.prepare(`
    SELECT u.id, u.name, u.role,
           COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) as pts,
           COUNT(pl.id) as cnt
    FROM point_logs pl
    JOIN users u ON u.id = pl.user_id
    WHERE u.blocked = 0${from ? ' AND pl.created_at >= ?' : ''}${nameWhere}
    GROUP BY u.id ORDER BY pts DESC LIMIT 100
  `).all(...[from ? from : null].filter(Boolean), ...nameArgs);

  return NextResponse.json({ section: 'general', period, list: rows });
}
