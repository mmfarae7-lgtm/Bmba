import { NextResponse } from 'next/server';
const { getVapidKeys } = require('../../../../lib/push');

export async function GET() {
  try {
    const { publicKey } = await getVapidKeys();
    return NextResponse.json({ publicKey });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}