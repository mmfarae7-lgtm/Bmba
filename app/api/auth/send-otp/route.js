import { NextResponse } from 'next/server';
const { requestOtp } = require('../../../../lib/otp');

export async function POST(req) {
  try {
    const { phone, phone_code, purpose } = await req.json();
    const result = await requestOtp(phone, phone_code, purpose === 'login' ? 'login' : 'register');
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}