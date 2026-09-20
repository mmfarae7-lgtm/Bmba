import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAuth, errorResponse } = require('../../../../lib/auth');

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const item = await db.prepare('SELECT * FROM store_items WHERE id = ? AND active = 1').get(Number(body.item_id));
    if (!item) return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });

    const balance = Number(user.bombs || 0);
    if (balance < item.price) {
      return NextResponse.json({ error: `رصيدك لا يكفي — تحتاج ${item.price} بمبة` }, { status: 400 });
    }

    await db.prepare('UPDATE users SET bombs = bombs - ? WHERE id = ?').run(item.price, user.id);
    await db.prepare('INSERT INTO store_purchases (user_id, item_id, price) VALUES (?, ?, ?)').run(user.id, item.id, item.price);

    let bombs = balance - item.price;
    if (item.type === 'bombs' && item.value > 0) {
      await db.prepare('UPDATE users SET bombs = bombs + ? WHERE id = ?').run(item.value, user.id);
      bombs += item.value;
    }

    return NextResponse.json({
      message: 'تمت عملية الشراء 🎉',
      balance: bombs,
      bonus_bombs: item.type === 'bombs' ? item.value : 0,
    });
  } catch (e) {
    return errorResponse(e);
  }
}