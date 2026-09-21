import { NextResponse } from 'next/server';
const { requireAuth, errorResponse } = require('../../../../lib/auth');
const { redeemVoucher } = require('../../../../lib/bomba-store');

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { voucher_id } = await req.json();
    if (!voucher_id) {
      return NextResponse.json({ error: 'اختر القسيمة أولاً' }, { status: 400 });
    }
    const result = await redeemVoucher(user.id, voucher_id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}