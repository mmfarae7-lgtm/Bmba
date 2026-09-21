import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin, errorResponse } = require('../../../../lib/auth');
const { addMerchant, addProduct, addVoucher } = require('../../../../lib/bomba-store');

export async function GET(req) {
  try {
    await requireAdmin(req);
    const merchants = await db.prepare('SELECT * FROM store_merchants ORDER BY id DESC').all();
    const products = await db.prepare('SELECT * FROM store_products ORDER BY id DESC').all();
    const vouchers = await db.prepare('SELECT * FROM store_vouchers ORDER BY id DESC').all();
    const redemptions = await db.prepare(`
      SELECT uv.*, v.title as voucher_title, m.name as merchant_name, u.name as user_name
      FROM user_vouchers uv
      JOIN store_vouchers v ON v.id = uv.voucher_id
      LEFT JOIN store_merchants m ON m.id = v.merchant_id
      LEFT JOIN users u ON u.id = uv.user_id
      ORDER BY uv.redeemed_at DESC
      LIMIT 100
    `).all();
    return NextResponse.json({ merchants, products, vouchers, redemptions });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const entity = String(body.entity || '');
    let id;
    if (entity === 'merchant') {
      id = await addMerchant(body);
    } else if (entity === 'product') {
      id = await addProduct(body);
    } else if (entity === 'voucher') {
      id = await addVoucher(body);
    } else {
      return NextResponse.json({ error: 'نوع غير معروف' }, { status: 400 });
    }
    return NextResponse.json({ message: 'تمت الإضافة', id });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req) {
  try {
    await requireAdmin(req);
    const entity = String(new URL(req.url).searchParams.get('entity') || '');
    const id = Number(new URL(req.url).searchParams.get('id'));
    const body = await req.json();
    if (!entity || !id) return NextResponse.json({ error: 'entity و id مطلوبان' }, { status: 400 });

    if (entity === 'product') {
      await db.prepare(
        'UPDATE store_products SET merchant_id = ?, name = ?, brand = ?, description = ?, image = ?, price_sar = ?, discount_label = ?, active = ? WHERE id = ?'
      ).run(
        Number(body.merchant_id) || null,
        String(body.name || '').trim(),
        String(body.brand || ''),
        String(body.description || ''),
        String(body.image || ''),
        Number(body.price_sar) || 0,
        String(body.discount_label || ''),
        body.active === false ? 0 : 1,
        id
      );
      return NextResponse.json({ message: 'تم حفظ التعديلات ✅' });
    }

    return NextResponse.json({ error: 'نوع غير معروف للتعديل' }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req) {
  try {
    await requireAdmin(req);
    const entity = String(new URL(req.url).searchParams.get('entity') || '');
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!entity || !id) return NextResponse.json({ error: 'entity و id مطلوبان' }, { status: 400 });
    const tables = { merchant: 'store_merchants', product: 'store_products', voucher: 'store_vouchers' };
    const table = tables[entity];
    if (!table) return NextResponse.json({ error: 'نوع غير معروف' }, { status: 400 });
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    return NextResponse.json({ message: 'تم الحذف' });
  } catch (e) {
    return errorResponse(e);
  }
}