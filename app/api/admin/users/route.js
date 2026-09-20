import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireSuperAdmin } = require('../../../../lib/auth');

export async function GET(req) {
  try {
    await requireSuperAdmin(req);
    const users = await db.prepare('SELECT id, name, phone, points, role, blocked, created_at FROM users ORDER BY created_at DESC').all();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireSuperAdmin(req);
    const { user_id, role, name } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    if (name !== undefined) {
      const clean = String(name).trim();
      if (!clean) {
        return NextResponse.json({ error: 'الاسم لا يمكن أن يكون فارغاً' }, { status: 400 });
      }
      await db.prepare('UPDATE users SET name = ? WHERE id = ?').run(clean, user_id);
      return NextResponse.json({ message: 'تم تحديث الاسم' });
    }
    if (!role) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json({ error: 'دور غير صحيح' }, { status: 400 });
    }
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user_id);
    return NextResponse.json({ message: 'تم تحديث الدور' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req) {
  try {
    const admin = await requireSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    const target = await db.prepare('SELECT id, role, phone FROM users WHERE id = ?').get(id);
    if (!target) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }
    if (target.role === 'superadmin') {
      return NextResponse.json({ error: 'لا يمكن حذف مدير النظام' }, { status: 400 });
    }
    if (target.id === admin.id) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الحالي' }, { status: 400 });
    }
    await db.prepare('DELETE FROM predictions WHERE user_id = ?').run(id);
    await db.prepare('DELETE FROM messages WHERE user_id = ?').run(id);
    await db.prepare('DELETE FROM point_logs WHERE user_id = ?').run(id);
    await db.prepare('DELETE FROM favorites WHERE user_id = ?').run(id);
    await db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return NextResponse.json({ message: 'تم حذف الحساب' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}