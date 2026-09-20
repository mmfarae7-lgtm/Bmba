import { NextResponse } from 'next/server';
const { requireAuth } = require('../../../../lib/auth');
const db = require('../../../../lib/db');

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { enabled } = await req.json();
    const flag = enabled === true || enabled === 'true' ? 1 : 0;
    await db.prepare('UPDATE users SET notifications = ? WHERE id = ?').run(flag, user.id);
    return NextResponse.json({ enabled: !!flag });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}