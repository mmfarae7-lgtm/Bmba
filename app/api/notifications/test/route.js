import { NextResponse } from 'next/server';
const { requireAuth } = require('../../../../lib/auth');
const { sendPushToUser } = require('../../../../lib/push');

// إرسال إشعار تجريبي للمستخدم نفسه (زر «جرّب الإشعار» في لوحة الجرس)
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const result = await sendPushToUser(
      user.id,
      '🔔 إشعارات بمبا تعمل!',
      'أنت الآن تتلقى الإشعارات حتى مع إغلاق التطبيق.',
      '/'
    );
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}