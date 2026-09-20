import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin } = require('../../../../lib/auth');
const { calculatePointsForMatch } = require('../../../../lib/points');

export async function POST(req) {
  try {
    await requireAdmin(req);
    const { id, toggle, points_value } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const match = await db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    if (!match) {
      return NextResponse.json({ error: 'المباراة غير موجودة' }, { status: 404 });
    }

    if (toggle === 'counts') {
      const next = match.counts ? 0 : 1;
      await db.prepare('UPDATE matches SET counts = ? WHERE id = ?').run(next, id);
      if (match.status === 'finished') await calculatePointsForMatch(id);
      return NextResponse.json({ message: next ? 'تم تفعيل احتساب النقاط' : 'تم إيقاف احتساب النقاط', counts: next });
    }

    if (toggle === 'fire') {
      const next = match.fire ? 0 : 1;
      if (next === 1) {
        await db.prepare('UPDATE matches SET fire = 0 WHERE match_date = ?').run(match.match_date);
      }
      await db.prepare('UPDATE matches SET fire = ?, counts = ? WHERE id = ?').run(next, next, id);
      if (match.status === 'finished') await calculatePointsForMatch(id);
      return NextResponse.json({ message: next ? '🔥 أصبحت مباراة نارية لهذا اليوم' : 'ألغيت المباراة النارية', fire: next });
    }

    if (toggle === 'featured') {
      const next = match.featured ? 0 : 1;
      if (next === 1) {
        await db.prepare('UPDATE matches SET featured = 0 WHERE match_date = ?').run(match.match_date);
      }
      await db.prepare('UPDATE matches SET featured = ? WHERE id = ?').run(next, id);
      return NextResponse.json({ message: next ? '⭐ المباراة المميزة (غرفة خاصة)' : 'ألغيت الميزة الخاصة', featured: next });
    }

    if (toggle === 'points') {
      const val = parseInt(points_value);
      if (isNaN(val) || val < 1) {
        return NextResponse.json({ error: 'قيمة النقاط غير صحيحة' }, { status: 400 });
      }
      await db.prepare('UPDATE matches SET points_value = ?, custom_points = 1 WHERE id = ?').run(val, id);
      if (match.status === 'finished') await calculatePointsForMatch(id);
      return NextResponse.json({ message: `تم ضبط قيمة النقاط المخصصة: ${val}`, points_value: val, custom_points: 1 });
    }

    return NextResponse.json({ error: 'عملية غير معروفة' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}