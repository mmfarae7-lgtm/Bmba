import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ message: 'تم تسجيل الخروج' });
  res.cookies.set('token', '', { expires: new Date(0), path: '/' });
  res.cookies.set('guest', '', { expires: new Date(0), path: '/' });
  return res;
}