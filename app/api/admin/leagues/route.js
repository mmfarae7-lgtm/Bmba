import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin } = require('../../../../lib/auth');

export async function GET(req) {
  try {
    await requireAdmin(req);
    const leagues = await db.prepare('SELECT * FROM leagues ORDER BY id').all();
    return NextResponse.json({ leagues });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireAdmin(req);
    const { name, country } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'أدخل اسم الدوري' }, { status: 400 });
    }
    const result = await db.prepare('INSERT INTO leagues (name, country) VALUES (?, ?)').run(name, country || '');
    return NextResponse.json({ message: 'تمت إضافة الدوري', id: result.lastInsertRowid });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const league = await db.prepare('SELECT * FROM leagues WHERE id = ?').get(id);
    if (!league) {
      return NextResponse.json({ error: 'الدوري غير موجود' }, { status: 404 });
    }
    const matchIds = await db.prepare('SELECT id FROM matches WHERE league_id = ?').all(id);
    for (const m of matchIds) {
      const preds = await db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(m.id);
      for (const p of preds) {
        const total = (p.points_earned || 0) + (p.unique_bonus || 0);
        if (total > 0) await db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(total, p.user_id);
      }
      await db.prepare('DELETE FROM predictions WHERE match_id = ?').run(m.id);
      await db.prepare('DELETE FROM favorites WHERE match_id = ?').run(m.id);
    }
    await db.prepare('DELETE FROM matches WHERE league_id = ?').run(id);
    await db.prepare('DELETE FROM leagues WHERE id = ?').run(id);
    return NextResponse.json({ message: 'تم حذف الدوري' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}