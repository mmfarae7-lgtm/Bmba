import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin, errorResponse } = require('../../../../lib/auth');

export async function GET(req) {
  try {
    await requireAdmin(req);
    const items = await db.prepare('SELECT * FROM store_items ORDER BY price, id DESC').all();
    const purchases = await db.prepare(`
      SELECT sp.*, si.title, si.icon, u.name as user_name
      FROM store_purchases sp
      JOIN store_items si ON si.id = sp.item_id
      JOIN users u ON u.id = sp.user_id
      ORDER BY sp.created_at DESC LIMIT 50
    `).all();
    return NextResponse.json({ items, purchases });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const title = String(body.title || '').trim();
    const price = Number(body.price);
    if (!title || !price || price < 0) return NextResponse.json({ error: 'الاسم والسعر مطلوبان' }, { status: 400 });
    const res = await db.prepare('INSERT INTO store_items (title, icon, description, price, type, value) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        title,
        String(body.icon || '🎁').slice(0, 8),
        String(body.description || ''),
        Math.floor(price),
        String(body.type === 'bombs' ? 'bombs' : 'item'),
        Math.max(0, Number(body.value) || 0)
      );
    return NextResponse.json({ message: 'تمت إضافة العنصر', id: res.lastInsertRowid });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req) {
  try {
    await requireAdmin(req);
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'معرّف العنصر مطلوب' }, { status: 400 });
    await db.prepare('DELETE FROM store_items WHERE id = ?').run(id);
    return NextResponse.json({ message: 'تم حذف العنصر' });
  } catch (e) {
    return errorResponse(e);
  }
}