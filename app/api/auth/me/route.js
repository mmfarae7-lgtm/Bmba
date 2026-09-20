import { NextResponse } from 'next/server';
const { getUserFromRequest } = require('../../../../lib/auth');

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}