import { NextResponse } from 'next/server';
import { buildAuthUrl, isConfigured } from '../../../../lib/social-auth';

export async function GET() {
  try {
    if (!(await isConfigured('google'))) {
      return NextResponse.json({ error: 'تسجيل الدخول عبر جوجل غير مفعّل حالياً' }, { status: 400 });
    }
    const state = 'bomba:' + Math.random().toString(36).slice(2);
    const url = await buildAuthUrl('google', state);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}