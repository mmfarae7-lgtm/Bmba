import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { isMatchStarted } = require('../../../lib/match-time');

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { match_id, home_score, away_score } = await req.json();
    if (match_id === undefined || home_score === undefined || away_score === undefined) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const hs = Number(home_score);
    const as = Number(away_score);
    if (!Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || hs > 99 || as < 0 || as > 99) {
      return NextResponse.json({ error: 'النتيجة يجب أن تكون رقماً بين 0 و 99' }, { status: 400 });
    }
    const match = await db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
    if (!match) {
      return NextResponse.json({ error: 'المباراة غير موجودة' }, { status: 404 });
    }
    if (isMatchStarted(match)) {
      return NextResponse.json({ error: 'بدأت المباراة - لا يمكن التوقع الآن' }, { status: 400 });
    }
    if (!match.counts && !match.fire) {
      return NextResponse.json({ error: 'هذه المباراة للعرض فقط - لا تُحسب للتوقع' }, { status: 400 });
    }
    const existing = await db.prepare('SELECT id, points_earned FROM predictions WHERE user_id = ? AND match_id = ?').get(user.id, match_id);
    if (existing) {
      await db.prepare('UPDATE predictions SET home_score = ?, away_score = ?, points_earned = 0 WHERE id = ?').run(home_score, away_score, existing.id);
      return NextResponse.json({ message: 'تم تحديث توقعك' });
    }
    await db.prepare('INSERT INTO predictions (user_id, match_id, home_score, away_score) VALUES (?, ?, ?, ?)').run(user.id, match_id, home_score, away_score);
    return NextResponse.json({ message: 'تم حفظ توقعك' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const matchId = url.searchParams.get('match_id');
    
    if (matchId) {
      const pred = await db.prepare('SELECT * FROM predictions WHERE user_id = ? AND match_id = ?').get(user.id, matchId);
      return NextResponse.json({ prediction: pred || null });
    }
    
    const predictions = await db.prepare(`
      SELECT p.*, m.home_team, m.away_team, m.home_score as actual_home, m.away_score as actual_away, m.status, m.match_date, m.match_time,
             l.name as league_name
      FROM predictions p
      JOIN matches m ON p.match_id = m.id
      LEFT JOIN leagues l ON m.league_id = l.id
      WHERE p.user_id = ?
      ORDER BY m.match_date DESC, m.match_time DESC
    `).all(user.id);
    return NextResponse.json({ predictions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
