import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin, requireSuperAdmin, errorResponse } = require('../../../../lib/auth');
const ch = require('../../../../lib/champions');

export async function GET(req) {
  try {
    await requireAdmin(req);
    const preds = await db.prepare(`
      SELECT cp.id, cp.category, cp.league, cp.answer, u.name as user_name, u.id as user_id
      FROM champion_predictions cp JOIN users u ON u.id = cp.user_id
      ORDER BY cp.league, cp.category
    `).all();
    const results = await ch.resultsMap();
    return NextResponse.json({ predictions: preds, results });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    await requireSuperAdmin(req);
    const body = await req.json();
    const league = String(body.league || '');
    const category = String(body.category || '');
    const winner = String(body.winner || '').trim();
    const award = Math.max(0, Number(body.award_bombs) || 0);

    if (!ch.OPTIONS[league] || !ch.OPTIONS[league][category]) {
      return NextResponse.json({ error: 'اختيار غير صالح' }, { status: 400 });
    }

    await db.prepare(`
      INSERT INTO champion_results (category, league, winner, award_bombs)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(category, league) DO UPDATE SET winner = excluded.winner, award_bombs = excluded.award_bombs, settled_at = CURRENT_TIMESTAMP
    `).run(category, league, winner, award);

    const correct = await db.prepare('SELECT user_id FROM champion_predictions WHERE category = ? AND league = ? AND answer = ?')
      .all(category, league, winner);

    let awarded = 0;
    for (const r of correct) {
      const already = await db.prepare('SELECT id FROM champion_awards WHERE user_id = ? AND category = ? AND league = ?')
        .get(r.user_id, category, league);
      if (already) continue;
      await db.prepare('INSERT INTO champion_awards (user_id, category, league, bombs) VALUES (?, ?, ?, ?)')
        .run(r.user_id, category, league, award);
      if (award > 0) {
        await db.prepare('UPDATE users SET bombs = bombs + ? WHERE id = ?').run(award, r.user_id);
      }
      awarded++;
    }

    return NextResponse.json({ message: `تم إعلان النتيجة • ${awarded} عضو صحيح حصل على الجائزة` });
  } catch (e) {
    return errorResponse(e);
  }
}