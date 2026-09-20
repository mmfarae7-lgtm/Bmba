import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({
    user: { id: -1, name: 'ضيف', phone: null, email: null, points: 0, role: 'guest', guest: true }
  });
  res.cookies.set('guest', '1', { httpOnly: true, maxAge: 60 * 60 * 24, path: '/' });
  res.cookies.set('bomba-onboarded', '1', { maxAge: 60 * 60 * 24 * 365, path: '/' });
  return res;
}