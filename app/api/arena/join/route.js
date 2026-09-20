import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAuth, errorResponse } = require('../../../../lib/auth');

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) return NextResponse.json({ error: 'أدخل رمز الحلبة' }, { status: 400 });

    const arena = await db.prepare('SELECT * FROM arenas WHERE code = ?').get(code);
    if (!arena) return NextResponse.json({ error: 'رمز غير صحيح — تحقق من الكود' }, { status: 404 });
    if (arena.owner_id === user.id) return NextResponse.json({ error: 'هذه حلبتك الخاصة' }, { status: 400 });

    const isMember = await db.prepare('SELECT id FROM arena_members WHERE arena_id = ? AND user_id = ?').get(arena.id, user.id);
    if (isMember) return NextResponse.json({ error: 'أنت عضو بالفعل في هذه الحلبة' }, { status: 400 });

    const lim = await db.prepare(`
      SELECT COUNT(*) as c FROM arena_members am
      JOIN arenas a ON a.id = am.arena_id
      WHERE am.user_id = ? AND a.owner_id != ?
    `).get(user.id, user.id);
    if (lim.c >= 2) return NextResponse.json({ error: 'تسمح بالاشتراك في حلبتين كحد أقصى' }, { status: 400 });

    await db.prepare('INSERT INTO arena_members (arena_id, user_id) VALUES (?, ?)').run(arena.id, user.id);
    return NextResponse.json({ message: 'انضممت إلى الحلبة بنجاح 🎯', arena });
  } catch (e) {
    return errorResponse(e);
  }
}