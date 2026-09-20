import { NextResponse } from 'next/server';
const { requireAuth } = require('../../../../lib/auth');
const { claim, today } = require('../../../../lib/rewards');

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const res = await claim(user.id, 'share', today(), 5);
    return NextResponse.json({ ...res, earned: res.claimed ? 5 : 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}