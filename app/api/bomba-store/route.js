import { NextResponse } from 'next/server';
const { requireAuth } = require('../../../lib/auth');
const { getStoreCatalog, getUserVouchers } = require('../../../lib/bomba-store');

export async function GET(req) {
  try {
    const catalog = await getStoreCatalog();
    let balance = 0;
    let myVouchers = [];
    try {
      const user = await requireAuth(req);
      balance = user.bombs || 0;
      myVouchers = await getUserVouchers(user.id);
    } catch {}
    return NextResponse.json({ ...catalog, balance, myVouchers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}