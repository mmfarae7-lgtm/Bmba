import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { requireAuth, errorResponse } = require('../../../lib/auth');

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeCode(len = 6) {
  let code = '';
  for (let i = 0; i < len; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function uniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = makeCode();
    const exists = await db.prepare('SELECT id FROM arenas WHERE code = ?').get(code);
    if (!exists) return code;
  }
  throw new Error('تعذر توليد رمز الحلبة');
}

async function limits(userId) {
  const owned = await db.prepare('SELECT COUNT(*) as c FROM arenas WHERE owner_id = ?').get(userId);
  const joined = await db.prepare(`
    SELECT COUNT(*) as c FROM arena_members am
    JOIN arenas a ON a.id = am.arena_id
    WHERE am.user_id = ? AND a.owner_id != ?
  `).get(userId, userId);
  return { owned: owned.c, joined: joined.c, max_owned: 1, max_joined: 2 };
}

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const owned = await db.prepare(`
      SELECT a.*, u.name as owner_name,
             (SELECT COUNT(*) FROM arena_members am WHERE am.arena_id = a.id) as members_count
      FROM arenas a JOIN users u ON u.id = a.owner_id
      WHERE a.owner_id = ? ORDER BY a.created_at DESC
    `).all(user.id);
    const joined = await db.prepare(`
      SELECT a.*, u.name as owner_name,
             (SELECT COUNT(*) FROM arena_members am WHERE am.arena_id = a.id) as members_count
      FROM arena_members am
      JOIN arenas a ON a.id = am.arena_id
      JOIN users u ON u.id = a.owner_id
      WHERE am.user_id = ? AND a.owner_id != ? ORDER BY a.created_at DESC
    `).all(user.id, user.id);
    return NextResponse.json({
      owned,
      joined,
      limits: await limits(user.id),
      all: [...owned, ...joined],
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const name = String(body.name || '').trim();
    const tag = String(body.tag || '').trim();
    if (!name) return NextResponse.json({ error: 'اسم الحلبة مطلوب' }, { status: 400 });
    const lim = await limits(user.id);
    if (lim.owned >= 1) return NextResponse.json({ error: 'يمكنك إنشاء حلبة واحدة فقط' }, { status: 400 });

    const code = await uniqueCode();
    const res = await db.prepare('INSERT INTO arenas (name, code, owner_id, tag) VALUES (?, ?, ?, ?)')
      .run(name, code, user.id, tag);
    await db.prepare('INSERT INTO arena_members (arena_id, user_id) VALUES (?, ?)').run(res.lastInsertRowid, user.id);
    const arena = await db.prepare('SELECT * FROM arenas WHERE id = ?').get(res.lastInsertRowid);
    return NextResponse.json({ message: 'تم إنشاء الحلبة 🎯', arena });
  } catch (e) {
    return errorResponse(e);
  }
}