import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const favorites = await db.prepare(`
      SELECT f.match_id, m.home_team, m.away_team, m.match_date, m.match_time,
             m.status, m.home_score, m.away_score, m.minute, m.home_logo, m.away_logo,
             m.counts, m.fire, m.points_value,
             l.name as league_name, l.id as league_id, l.logo_url as league_logo
      FROM favorites f
      JOIN matches m ON f.match_id = m.id
      LEFT JOIN leagues l ON m.league_id = l.id
      WHERE f.user_id = ?
      ORDER BY m.match_date DESC, m.match_time DESC
    `).all(user.id);
    return NextResponse.json({ favorites });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { match_id } = await req.json();
    if (!match_id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const match = await db.prepare('SELECT id FROM matches WHERE id = ?').get(match_id);
    if (!match) {
      return NextResponse.json({ error: 'المباراة غير موجودة' }, { status: 404 });
    }
    const existing = await db.prepare('SELECT id FROM favorites WHERE user_id = ? AND match_id = ?').get(user.id, match_id);
    if (existing) {
      await db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
      return NextResponse.json({ favorited: false, message: 'أزيلت من المفضلة' });
    }
    await db.prepare('INSERT OR IGNORE INTO favorites (user_id, match_id) VALUES (?, ?)').run(user.id, match_id);
    return NextResponse.json({ favorited: true, message: 'أضيفت للمفضلة' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}