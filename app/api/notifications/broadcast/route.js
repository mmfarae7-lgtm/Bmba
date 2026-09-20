import { NextResponse } from 'next/server';
const { requireAuth, requireAdmin } = require('../../../../lib/auth');
const { sendPushToAll } = require('../../../../lib/push');

// إرسال إشعار جماعي لجميع المشتركين (خاص بالمشرف)
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    requireAdmin(user);
    const { title, body, url } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'أدخل العنوان والنص' }, { status: 400 });
    }
    const result = await sendPushToAll(String(title), String(body), String(url || '/'));
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}