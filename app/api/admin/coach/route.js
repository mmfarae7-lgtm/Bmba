import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin, errorResponse } = require('../../../../lib/auth');
const coach = require('../../../../lib/coach');

export async function GET(req) {
  try {
    await requireAdmin(req);
    const week = coach.currentWeek();
    const players = await db.prepare('SELECT * FROM players ORDER BY league, position, price_bombs DESC').all();
    const weeks = await db.prepare('SELECT DISTINCT week FROM coach_week_points ORDER BY week DESC').all();
    const settles = await db.prepare('SELECT week FROM coach_week_settles').all();
    const settledSet = new Set(settles.map((s) => s.week));
    const points = await db.prepare('SELECT week, player_id, points FROM coach_week_points').all();
    return NextResponse.json({ week, players, weeks, settled: [...settledSet], points });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'add_player') {
      const name = String(body.name || '').trim();
      const club = String(body.club || '').trim();
      const position = String(body.position || '');
      const league = String(body.league || '');
      const market = Number(body.market_value_m);
      if (!name || !club || !['GK', 'DEF', 'MID', 'FWD'].includes(position) || !['EPL', 'LIGA', 'SAU'].includes(league)) {
        return NextResponse.json({ error: 'بيانات اللاعب غير مكتملة' }, { status: 400 });
      }
      const price = Math.max(10, market * 10);
      const res = await db.prepare('INSERT INTO players (name, club, position, league, market_value_m, price_bombs) VALUES (?, ?, ?, ?, ?, ?)')
        .run(name, club, position, league, Number.isFinite(market) ? market : 0, price);
      return NextResponse.json({ message: 'تمت إضافة اللاعب', id: res.lastInsertRowid });
    }

    if (action === 'sync_points') {
      // نقاط أسبوعية موجبة وسالبة {week, player_id, points}
      const entries = Array.isArray(body.entries) ? body.entries : [];
      let n = 0;
      for (const e of entries) {
        const week = Number(e.week);
        const pid = Number(e.player_id);
        const pts = Number(e.points);
        if (!week || !pid || isNaN(pts)) continue;
        await db.prepare(`
          INSERT INTO coach_week_points (week, player_id, points) VALUES (?, ?, ?)
          ON CONFLICT(week, player_id) DO UPDATE SET points = excluded.points
        `).run(week, pid, pts);
        n++;
      }
      return NextResponse.json({ message: `تم تحديث نقاط ${n} لاعب` });
    }

    if (action === 'settle_week') {
      const week = Number(body.week) || coach.currentWeek();
      const settled = await db.prepare('SELECT id FROM coach_week_settles WHERE week = ?').get(week);
      if (settled) return NextResponse.json({ error: 'هذا الأسبوع مُسوّى من قبل' }, { status: 400 });

      const teams = await db.prepare('SELECT * FROM coach_teams').all();
      // أسبوع واحد فقط: مجموع نقاط الفريق = مجموع نقاط لاعبي تشكيلته في ذلك الأسبوع
      for (const t of teams) {
        const squadPts = await db.prepare(`
          SELECT COALESCE(SUM(wp.points), 0) as total
          FROM coach_squad cs LEFT JOIN coach_week_points wp ON wp.player_id = cs.player_id AND wp.week = ?
          WHERE cs.team_id = ?
        `).get(week, t.id);
        const pts = Number(squadPts.total || 0);
        if (pts !== 0) {
          await db.prepare('UPDATE users SET bombs = bombs + ? WHERE id = ?').run(pts, t.user_id);
          await db.prepare('INSERT INTO point_logs (user_id, points, reason) VALUES (?, ?, ?)')
            .run(t.user_id, pts, `أنت المدرب: نقاط أسبوع ${week} لتشكيلتك`);
        }
      }
      await db.prepare('INSERT INTO coach_week_settles (week) VALUES (?)').run(week);
      return NextResponse.json({ message: `تم تسوية الأسبوع ${week} • حوّلت النقاط بمبات للمدربين` });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}