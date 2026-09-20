import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { requireAuth, errorResponse } = require('../../../lib/auth');

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const items = await db.prepare('SELECT * FROM store_items WHERE active = 1 ORDER BY price LIMIT 100').all();
    const purchases = await db.prepare(`
      SELECT sp.id, sp.item_id, sp.price, sp.created_at, si.title, si.icon
      FROM store_purchases sp JOIN store_items si ON si.id = sp.item_id
      WHERE sp.user_id = ? ORDER BY sp.created_at DESC LIMIT 20
    `).all(user.id);
    const purchasedIds = purchases.map((p) => p.item_id);
    return NextResponse.json({
      items: items.map((it) => ({ ...it, purchased: purchasedIds.includes(it.id) })),
      purchases,
      balance: user.bombs || 0,
    });
  } catch (e) {
    return errorResponse(e);
  }
}