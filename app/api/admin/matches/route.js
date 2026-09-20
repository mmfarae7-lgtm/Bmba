import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin } = require('../../../../lib/auth');
const { calculatePointsForMatch } = require('../../../../lib/points');

function num(v, def = 0) {
  const n = parseInt(v);
  return isNaN(n) ? def : n;
}

export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    const { league_id, home_team, away_team, match_date, match_time, status, home_score, away_score, minute, counts, fire, points_value, custom_points } = await req.json();
    if (!home_team || !away_team || !match_date) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const result = await db.prepare(
      'INSERT INTO matches (league_id, home_team, away_team, match_date, match_time, status, home_score, away_score, minute, counts, fire, points_value, custom_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(league_id || null, home_team, away_team, match_date, match_time || '', status || 'upcoming', home_score || 0, away_score || 0, minute || '', num(counts), num(fire), num(points_value, 0), num(custom_points));

    if (status === 'finished' && (num(counts) || num(fire))) {
      await calculatePointsForMatch(result.lastInsertRowid);
    }

    return NextResponse.json({ message: 'تمت إضافة المباراة', id: result.lastInsertRowid });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PUT(req) {
  try {
    const admin = await requireAdmin(req);
    const { id, league_id, home_team, away_team, match_date, match_time, status, home_score, away_score, minute, counts, fire, points_value, custom_points } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    const oldMatch = await db.prepare('SELECT * FROM matches WHERE id = ?').get(id);

    await db.prepare(
      'UPDATE matches SET league_id=?, home_team=?, away_team=?, match_date=?, match_time=?, status=?, home_score=?, away_score=?, minute=?, counts=?, fire=?, points_value=?, custom_points=? WHERE id=?'
    ).run(league_id || null, home_team, away_team, match_date, match_time || '', status || 'upcoming', home_score || 0, away_score || 0, minute || '', num(counts), num(fire), num(points_value, oldMatch?.points_value || 0), num(custom_points, oldMatch?.custom_points || 0), id);

    const shouldCount = num(counts) || num(fire);

    if (shouldCount && status === 'finished' && (!oldMatch || oldMatch.status !== 'finished' || oldMatch.counts !== num(counts) || oldMatch.fire !== num(fire) || oldMatch.points_value !== num(points_value, oldMatch?.points_value || 0) || (oldMatch.custom_points || 0) !== num(custom_points, oldMatch?.custom_points || 0))) {
      await calculatePointsForMatch(id);
    }

    return NextResponse.json({ message: 'تم تحديث المباراة' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req) {
  try {
    const admin = await requireAdmin(req);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const preds = await db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(id);
    for (const p of preds) {
      const total = (p.points_earned || 0) + (p.unique_bonus || 0);
      if (total > 0) await db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(total, p.user_id);
    }
    await db.prepare('DELETE FROM predictions WHERE match_id = ?').run(id);
    await db.prepare('DELETE FROM favorites WHERE match_id = ?').run(id);
    await db.prepare('DELETE FROM matches WHERE id = ?').run(id);
    return NextResponse.json({ message: 'تم حذف المباراة' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}