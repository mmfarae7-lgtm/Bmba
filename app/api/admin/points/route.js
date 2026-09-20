import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin } = require('../../../../lib/auth');

export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    const { user_id, points, reason } = await req.json();
    if (!user_id || points === undefined) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const user = await db.prepare('SELECT id, points FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }
    const newPoints = user.points + points;
    if (newPoints < 0) {
      return NextResponse.json({ error: 'النقاط لا يمكن أن تكون سالبة' }, { status: 400 });
    }
    await db.prepare('UPDATE users SET points = ? WHERE id = ?').run(newPoints, user_id);
    await db.prepare('INSERT INTO point_logs (user_id, points, reason, admin_id) VALUES (?, ?, ?, ?)').run(user_id, points, reason || 'تعديل يدوي', admin.id);
    return NextResponse.json({ message: 'تم تعديل النقاط', new_points: newPoints });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function GET(req) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      const logs = await db.prepare(`
        SELECT pl.*, u.name as user_name, a.name as admin_name
        FROM point_logs pl
        JOIN users u ON pl.user_id = u.id
        LEFT JOIN users a ON pl.admin_id = a.id
        WHERE pl.user_id = ?
        ORDER BY pl.created_at DESC
        LIMIT 50
      `).all(userId);
      return NextResponse.json({ logs });
    }
    
    const logs = await db.prepare(`
      SELECT pl.*, u.name as user_name, a.name as admin_name
      FROM point_logs pl
      JOIN users u ON pl.user_id = u.id
      LEFT JOIN users a ON pl.admin_id = a.id
      ORDER BY pl.created_at DESC
      LIMIT 100
    `).all();
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}