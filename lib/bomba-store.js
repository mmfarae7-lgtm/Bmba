const db = require('./db');
const crypto = require('crypto');

// ——— بيانات متجر بمبا: الشركاء والمنتجات والقسائم ———

async function getStoreCatalog() {
  const merchants = await db.prepare(
    'SELECT * FROM store_merchants WHERE active = 1 ORDER BY name'
  ).all();
  const products = await db.prepare(`
    SELECT p.*, m.name as merchant_name, m.logo as merchant_logo
    FROM store_products p
    LEFT JOIN store_merchants m ON m.id = p.merchant_id
    WHERE p.active = 1
    ORDER BY p.price_sar, p.id
  `).all();
  const vouchers = await db.prepare(`
    SELECT v.*, m.name as merchant_name, m.logo as merchant_logo
    FROM store_vouchers v
    LEFT JOIN store_merchants m ON m.id = v.merchant_id
    WHERE v.active = 1
    ORDER BY v.cost_bombs
  `).all();
  return { merchants, products, vouchers };
}

async function getUserVouchers(userId) {
  return db.prepare(`
    SELECT uv.*, v.title, v.description, v.type, v.discount, m.name as merchant_name, m.logo as merchant_logo
    FROM user_vouchers uv
    JOIN store_vouchers v ON v.id = uv.voucher_id
    LEFT JOIN store_merchants m ON m.id = v.merchant_id
    WHERE uv.user_id = ?
    ORDER BY uv.redeemed_at DESC
    LIMIT 100
  `).all(userId);
}

function makeVoucherCode() {
  return 'BMBA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// استبدال بمبات بقسيمة — يعيد null إذا رصيد غير كافٍ أو القسيمة غير متاحة
async function redeemVoucher(userId, voucherId) {
  const voucher = await db.prepare('SELECT * FROM store_vouchers WHERE id = ? AND active = 1').get(Number(voucherId));
  if (!voucher) return { error: 'القسيمة غير متاحة' };

  const user = await db.prepare('SELECT bombs FROM users WHERE id = ?').get(userId);
  const balance = Number(user?.bombs || 0);
  if (balance < voucher.cost_bombs) {
    return { error: `رصيدك لا يكفي للإستبدال — تحتاج ${voucher.cost_bombs} بمبة` };
  }

  const code = makeVoucherCode();
  await db.prepare('UPDATE users SET bombs = bombs - ? WHERE id = ?').run(voucher.cost_bombs, userId);
  await db.prepare('INSERT INTO user_vouchers (user_id, voucher_id, code) VALUES (?, ?, ?)').run(userId, voucher.id, code);

  return {
    ok: true,
    voucher: {
      code,
      title: voucher.title,
      description: voucher.description,
      type: voucher.type,
      discount: voucher.discount,
    },
    balance: balance - voucher.cost_bombs,
  };
}

// إدارة (مشرف): إضافة شركة شريكة
async function addMerchant(data) {
  const r = await db.prepare(
    'INSERT INTO store_merchants (name, type, category, description, logo, location, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    String(data.name || '').trim(),
    String(data.type || 'shop'),
    String(data.category || ''),
    String(data.description || ''),
    String(data.logo || '🏪').slice(0, 8),
    String(data.location || ''),
    String(data.phone || ''),
    data.active === false ? 0 : 1
  );
  return r.lastInsertRowid;
}

// إدارة: إضافة منتج
async function addProduct(data) {
  const r = await db.prepare(
    'INSERT INTO store_products (merchant_id, name, brand, description, image, price_sar, discount_label, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    Number(data.merchant_id) || null,
    String(data.name || '').trim(),
    String(data.brand || ''),
    String(data.description || ''),
    String(data.image || ''),
    Number(data.price_sar) || 0,
    String(data.discount_label || ''),
    data.active === false ? 0 : 1
  );
  return r.lastInsertRowid;
}

// إدارة: إضافة قسيمة
async function addVoucher(data) {
  const r = await db.prepare(
    'INSERT INTO store_vouchers (merchant_id, title, description, type, discount, cost_bombs, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    Number(data.merchant_id) || null,
    String(data.title || '').trim(),
    String(data.description || ''),
    String(data.type || 'discount'),
    Number(data.discount) || 0,
    Number(data.cost_bombs) || 0,
    data.active === false ? 0 : 1
  );
  return r.lastInsertRowid;
}

module.exports = {
  getStoreCatalog,
  getUserVouchers,
  redeemVoucher,
  makeVoucherCode,
  addMerchant,
  addProduct,
  addVoucher,
};