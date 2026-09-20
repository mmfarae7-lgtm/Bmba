import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin } = require('../../../../lib/auth');

export async function POST(req) {
  try {
    await requireAdmin(req);
    const { user_id, blocked } = await req.json();
    if (!user_id || blocked === undefined) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    await db.prepare('UPDATE users SET blocked = ? WHERE id = ?').run(blocked ? 1 : 0, user_id);
    return NextResponse.json({ message: blocked ? 'تم حظر المستخدم' : 'تم فتح الحظر' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}