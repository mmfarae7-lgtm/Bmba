import { NextResponse } from 'next/server';
const { requireAuth } = require('../../../../lib/auth');
const { saveSubscription } = require('../../../../lib/push');

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const saved = await saveSubscription(user.id, body.subscription);
    if (!saved) {
      return NextResponse.json({ error: 'بيانات الاشتراك غير صحيحة' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, reSubscribed: saved.reSubscribed });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}