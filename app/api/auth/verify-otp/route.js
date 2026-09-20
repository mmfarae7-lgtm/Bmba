import { NextResponse } from 'next/server';
const { verifyOtp } = require('../../../../lib/otp');

export async function POST(req) {
  try {
    const { phone, phone_code, code, purpose } = await req.json();
    const result = await verifyOtp(phone, phone_code, code, purpose === 'login' ? 'login' : 'register');
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, token: result.token, purpose: result.purpose });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}