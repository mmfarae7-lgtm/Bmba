import { NextResponse } from 'next/server';
const { requireAuth } = require('../../../../lib/auth');
const { ensureInviteCode } = require('../../../../lib/rewards');
const db = require('../../../../lib/db');

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const code = await ensureInviteCode(user);
    const fresh = await db.prepare('SELECT bombs FROM users WHERE id = ?').get(user.id);
    return NextResponse.json({ code, bombs: fresh ? fresh.bombs : 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}