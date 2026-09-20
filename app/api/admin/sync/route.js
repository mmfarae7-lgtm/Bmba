import { NextResponse } from 'next/server';
const { requireAdmin } = require('../../../../lib/auth');
const sports = require('../../../../lib/sports-api');

export async function POST(req) {
  try {
    await requireAdmin(req);
    if (!(await sports.isEnabled())) {
      return NextResponse.json({ error: 'فعّل المزامنة وأدخل المفتاح أولاً' }, { status: 400 });
    }
    const count = await sports.syncNow();
    return NextResponse.json({ message: 'تمت المزامنة', count, status: await sports.getStatus() });
  } catch (e) {
    return NextResponse.json({ error: e.message, status: await sports.getStatus() }, { status: e.status || 500 });
  }
}