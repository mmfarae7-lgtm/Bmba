import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { requireAuth, errorResponse } = require('../../../lib/auth');
const ch = require('../../../lib/champions');

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const answers = await ch.myAnswers(user.id);
    const results = await ch.resultsMap();
    const badges = await db.prepare(`
      SELECT ca.category, ca.league, ca.bombs FROM champion_awards ca WHERE ca.user_id = ?
    `).all(user.id);
    const badgeMap = {};
    for (const b of badges) {
      if (!badgeMap[b.league]) badgeMap[b.league] = {};
      badgeMap[b.league][b.category] = b.bombs;
    }
    return NextResponse.json({ leagues: ch.LEAGUES, categories: ch.CATEGORIES, options: ch.OPTIONS, answers, results, badges: badgeMap });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const league = String(body.league || '');
    const category = String(body.category || '');
    const answer = String(body.answer || '').trim();

    if (!ch.OPTIONS[league] || !ch.OPTIONS[league][category]) {
      return NextResponse.json({ error: 'اختيار غير صالح' }, { status: 400 });
    }
    if (!ch.OPTIONS[league][category].includes(answer)) {
      return NextResponse.json({ error: 'الإجابة غير موجودة في القائمة' }, { status: 400 });
    }

    const inserted = await db.prepare(`
      INSERT INTO champion_predictions (user_id, category, league, answer)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, category, league) DO UPDATE SET answer = excluded.answer, created_at = CURRENT_TIMESTAMP
    `).run(user.id, category, league, answer);

    return NextResponse.json({ message: 'تم حفظ توقعك 👑', changed: inserted.changes });
  } catch (e) {
    return errorResponse(e);
  }
}