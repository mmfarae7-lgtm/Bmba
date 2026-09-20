/**
 * مصادقة اجتماعية: Google OAuth 2.0 + Facebook Login
 *
 * يقرأ الإعدادات إما من متغيرات البيئة (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 * FACEBOOK_APP_ID, FACEBOOK_APP_SECRET) أو من جدول settings في قاعدة البيانات
 * (google_client_id, google_client_secret, facebook_app_id, facebook_app_secret).
 *
 * الدوال:
 * - buildAuthUrl(provider, state)      رابط تحويل للمزوّد
 * - exchangeCode(provider, code)       استبدال الكود ببيانات الملف الشخصي
 * - findOrCreateSocialUser(provider, profile)  إيجاد/إنشاء المستخدم
 */
const db = require('./db');
const bcrypt = require('bcryptjs');

async function getSetting(key) {
  try {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch {
    return null;
  }
}

function sureUrl() {
  return process.env.SITE_URL || process.env.APP_URL || 'https://bmba-app.vercel.app';
}

function clientId(provider) {
  if (provider === 'google') return process.env.GOOGLE_CLIENT_ID || getSetting('google_client_id');
  if (provider === 'facebook') return process.env.FACEBOOK_APP_ID || getSetting('facebook_app_id');
  return null;
}

function clientSecret(provider) {
  if (provider === 'google') return process.env.GOOGLE_CLIENT_SECRET || getSetting('google_client_secret');
  if (provider === 'facebook') return process.env.FACEBOOK_APP_SECRET || getSetting('facebook_app_secret');
  return null;
}

async function isConfigured(provider) {
  const id = await clientId(provider);
  const secret = await clientSecret(provider);
  return Boolean(id && secret);
}

/** رابط تحويل المستخدم لمزوّد الهوية */
async function buildAuthUrl(provider, state) {
  const base = sureUrl();
  const id = await clientId(provider);
  const redirectUri = `${base}/api/auth/${provider}/callback`;
  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: id || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  // facebook
  const params = new URLSearchParams({
    client_id: id || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

/** تبادل رمز التفويض والحصول على الملف الشخصي */
async function exchangeCode(provider, code) {
  const url = sureUrl();
  const redirectUri = `${url}/api/auth/${provider}/callback`;
  const id = await clientId(provider);
  const secret = await clientSecret(provider);
  if (!id || !secret) throw new Error('مصادقة ' + provider + ' غير مهيأة');

  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: id,
        client_secret: secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) throw new Error('فشل تبادل رمز جوجل');
    const token = await tokenRes.json();
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!infoRes.ok) throw new Error('فشل جلب بيانات جوجل');
    const info = await infoRes.json();
    return {
      providerId: String(info.id),
      email: (info.email || '').toLowerCase(),
      name: info.name || info.given_name || 'مستخدم جوجل',
      avatar: info.picture || null,
      emailVerified: Boolean(info.verified_email),
    };
  }

  // facebook
  const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      code,
    }).toString(),
  });
  if (!tokenRes.ok) throw new Error('فشل تبادل رمز فيسبوك');
  const token = await tokenRes.json();
  const infoRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token.access_token}`
  );
  if (!infoRes.ok) throw new Error('فشل جلب بيانات فيسبوك');
  const info = await infoRes.json();
  return {
    providerId: String(info.id),
    email: (info.email || '').toLowerCase() || null,
    name: info.name || 'مستخدم فيسبوك',
    avatar: info.picture && info.picture.data && info.picture.data.url ? info.picture.data.url : null,
    emailVerified: false,
  };
}

/** إيجاد المستخدم بربط المزوّد أو إنشائه */
async function findOrCreateSocialUser(provider, profile) {
  const col = provider === 'google' ? 'google_id' : 'facebook_id';
  let user = await db.prepare(`SELECT * FROM users WHERE ${col} = ?`).get(String(profile.providerId));
  if (user) return user;

  // 2) محاولة ربط بحساب بنفس البريد الإلكتروني
  if (profile.email) {
    user = await db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email);
    if (user) {
      await db.prepare(`UPDATE users SET ${col} = ?, avatar = COALESCE(avatar, ?) WHERE id = ?`)
        .run(String(profile.providerId), profile.avatar, user.id);
      return user;
    }
  }

  // 3) إنشاء مستخدم جديد
  const syntheticPhone = 's' + Date.now() + Math.floor(Math.random() * 99999);
  const hash = bcrypt.hashSync('social:' + Math.random().toString(36).slice(2), 10);
  const res = await db.prepare(`INSERT INTO users (name, phone, email, password, avatar, ${col}, bombs)
      VALUES (?, ?, ?, ?, ?, ?, 0)`)
    .run(profile.name, syntheticPhone, profile.email || null, hash, profile.avatar, String(profile.providerId));
  const newId = res.lastInsertRowid;

  // هدية الاشتراك + كود الدعوة
  const WELCOME_BOMBS = 100;
  await db.prepare('UPDATE users SET bombs = bombs + ? WHERE id = ?').run(WELCOME_BOMBS, newId);
  await db.prepare("INSERT OR IGNORE INTO rewards_claims (user_id, action, day, bombs) VALUES (?, 'welcome', '1', ?)").run(newId, WELCOME_BOMBS);
  const myCode = 'BM' + profile.name.replace(/\s+/g, '').toUpperCase().slice(0, 4) + newId;
  await db.prepare('UPDATE users SET invite_code = ? WHERE id = ?').run(myCode, newId);

  return await db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
}

module.exports = { buildAuthUrl, exchangeCode, findOrCreateSocialUser, isConfigured, sureUrl };