/**
 * إشعارات Web Push (الجوال يطلب الإذن ثم يتلقى الإشعارات حتى عند إغلاق التطبيق)
 *
 * مفاتيح VAPID:
 *  - إذا وُجدت VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY في البيئة تُستخدم مباشرة.
 *  - غير ذلك تُولَّد مرة واحدة وتُحفظ في جدول settings (تعمل فوراً دون أي إعداد).
 */
const webpush = require('web-push');
const db = require('./db');

const CONTACT = 'mailto:admin@bmba-app.vercel.app';

async function getSetting(key) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

async function setSetting(key, value) {
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}

/** مفاتيح VAPID: من البيئة أو مولّدة ومحفوظة في قاعدة البيانات */
async function getVapidKeys() {
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) return { publicKey: envPub, privateKey: envPriv };

  let pub = await getSetting('vapid_public');
  let priv = await getSetting('vapid_private');
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    pub = keys.publicKey;
    priv = keys.privateKey;
    await setSetting('vapid_public', pub);
    await setSetting('vapid_private', priv);
  }
  return { publicKey: pub, privateKey: priv };
}

/** تهيئة web-push بمفاتيح VAPID والإعدادات */
async function ensureConfigured() {
  const { publicKey, privateKey } = await getVapidKeys();
  webpush.setVapidDetails(CONTACT, publicKey, privateKey);
}

/** حفظ اشتراك لمستخدم (لا يتكرر endpoint) */
async function saveSubscription(userId, subscription) {
  if (!subscription || !subscription.endpoint || !subscription.keys) return null;
  const { endpoint, keys } = subscription;
  const p256dh = String(keys.p256dh || '');
  const auth = String(keys.auth || '');
  if (!p256dh || !auth) return null;

  const exists = await db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint);
  if (exists) {
    await db.prepare('UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE id = ?')
      .run(userId, p256dh, auth, exists.id);
    return { id: exists.id, reSubscribed: true };
  }
  const r = await db.prepare(
    'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, endpoint, p256dh, auth, Date.now());
  return { id: r.lastInsertRowid, reSubscribed: false };
}

async function subscriptionsOf(userId) {
  return db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
}

/** إرسال إشعار لمستخدم واحد (لكل أجهزته المسجلة) */
async function sendPushToUser(userId, title, body, url = '/') {
  const subs = await subscriptionsOf(userId);
  return sendPushToSubscriptions(subs, title, body, url);
}

/** إرسال إشعار لجميع المشتركين */
async function sendPushToAll(title, body, url = '/') {
  const subs = await db.prepare('SELECT * FROM push_subscriptions').all();
  return sendPushToSubscriptions(subs, title, body, url);
}

/** الإرسال الفعلي لمجموعة اشتراكات (يعيد عدد النجاح) */
async function sendPushToSubscriptions(subs, title, body, url) {
  if (!subs || subs.length === 0) return { sent: 0 };
  try {
    await ensureConfigured();
  } catch {
    return { sent: 0 };
  }
  const payload = JSON.stringify({ title, body, url, icon: '/icon-192.png', badge: '/icon-192.png' });
  let sent = 0;
  const toDelete = [];
  await Promise.all(subs.map(async (s) => {
    const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(sub, payload, { TTL: 60 * 60 });
      sent += 1;
    } catch (e) {
      // الاشتراك لم يعد صالحاً → حذفه لاحقاً
      if (e && (e.statusCode === 404 || e.statusCode === 410)) toDelete.push(s.id);
    }
  }));
  if (toDelete.length > 0) {
    for (const id of toDelete) {
      await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(id).catch(() => {});
    }
  }
  return { sent };
}

module.exports = {
  getVapidKeys,
  saveSubscription,
  subscriptionsOf,
  sendPushToUser,
  sendPushToAll,
  sendPushToSubscriptions,
};