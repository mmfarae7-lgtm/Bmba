/**
 * التحقق برمز (OTP) عبر SMS أو واتساب
 *
 * التدفق:
 *   requestOtp(phone, phoneCode, purpose)  → يولّد رمزاً ويحفظه ويحاول الإرسال
 *       - عند توفر مفاتيح Twilio: يُرسل فعلياً عبر SMS أو واتساب (SMS_CHANNEL)
 *       - بدون مفاتيح: وضع تجريبي → يعيد رمز devCode ليعرض في الواجهة
 *   verifyOtp(phone, phoneCode, code, purpose) → يتحقق ويُصدر توكن قصير الأمد
 *   checkOtpToken(token, phoneKey, purpose) → يتحقق من التوكن (يستخدمه التسجيل/الدخول)
 *
 * قنوات إرسال Twilio (اختيارية):
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_PHONE (لـ SMS)
 *   TWILIO_WHATSAPP_FROM (مثال whatsapp:+14155552671) مع SMS_CHANNEL=whatsapp
 */
const db = require('./db');
const jwt = require('jsonwebtoken');
const { SECRET } = require('./auth');

const OTP_TTL_MS = 10 * 60 * 1000; // صلاحية الرمز: 10 دقائق
const CODE_LENGTH = 6;

/** رقم طبيعي موحد يستخدم كمفتاح في الجدول والتوكنات (أرقام فقط مع رمز الدولة) */
function phoneKey(phone, phoneCode) {
  return ((phoneCode || '').replace(/[^0-9]/g, '') + String(phone || '').replace(/[^0-9]/g, ''));
}

/** صيغة E.164 للإرسال (بداية بعلامة +) */
function toE164(phone, phoneCode) {
  return '+' + phoneKey(phone, phoneCode);
}

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += Math.floor(Math.random() * 10);
  return code;
}

/** إرسال رسالة عبر Twilio (SMS أو واتساب حسب الإعدادات) */
async function sendViaTwilio(e164, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromSms = process.env.TWILIO_FROM_PHONE;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || (!fromSms && !fromWhatsApp)) return null; // غير مهيأة

  const useWhatsApp = (process.env.SMS_CHANNEL || 'auto').toLowerCase() === 'whatsapp' && fromWhatsApp;
  const from = useWhatsApp ? fromWhatsApp : fromSms;
  const to = useWhatsApp ? 'whatsapp:' + e164 : e164;

  const form = new URLSearchParams();
  form.set('To', to);
  form.set('From', from);
  form.set('Body', message);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('فشل إرسال الرسالة عبر Twilio (' + res.status + '): ' + text.slice(0, 200));
  }
  return { channel: useWhatsApp ? 'whatsapp' : 'sms' };
}

/**
 * طلب رمز تحقق
 * @returns {Promise<{sent:boolean, devCode:string|null, channel:'sms'|'whatsapp'|'dev'|null, expiresAt:number}>}
 */
async function requestOtp(phone, phoneCode, purpose = 'register') {
  if (!phone) throw new Error('أدخل رقم الجوال');
  const key = phoneKey(phone, phoneCode);
  if (key.length < 7) throw new Error('رقم الجوال غير صحيح');

  // مهلة قصيرة عن إعادة الإرسال (حماية من الإزعاج)
  const last = await db.prepare('SELECT * FROM otps WHERE phone = ? AND purpose = ? ORDER BY id DESC LIMIT 1').get(key, purpose);
  if (last && !last.used && last.created_at && Date.now() - Number(last.created_at) < 60 * 1000) {
    throw new Error('انتظر دقيقة قبل إعادة إرسال الرمز');
  }

  const code = generateCode();
  const expiresAt = Date.now() + OTP_TTL_MS;

  // إبطال أي رموز سابقة غير مستخدمة لنفس الرقم
  await db.prepare('UPDATE otps SET used = 1 WHERE phone = ? AND used = 0').run(key);

  await db.prepare('INSERT INTO otps (phone, code, purpose, expires_at, used, attempts, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)')
    .run(key, code, purpose, expiresAt, Date.now());

  const message = `رمز التحقق الخاص بك في بمبا لتوقعات: ${code}\nصالح لمدة 10 دقائق.`;

  const twilioOk = await sendViaTwilio(toE164(phone, phoneCode), message);
  if (twilioOk) {
    return { sent: true, devCode: null, channel: twilioOk.channel, expiresAt };
  }

  // وضع تجريبي: لا يوجد مزوّد إرسال → نعيد الرمز للواجهة لتتمكن من إكمال الاختبار
  return { sent: false, devCode: code, channel: 'dev', expiresAt };
}

/**
 * التحقق من الرمز وإصدار توكن قصير الأمد (صالح 15 دقيقة) يحمل الرقم والغرض
 * @returns {Promise<{ok:true, token:string, purpose:string} | {ok:false, error:string}>}
 */
async function verifyOtp(phone, phoneCode, code, purpose = 'register') {
  const key = phoneKey(phone, phoneCode);
  if (!code || String(code).trim().length === 0) return { ok: false, error: 'أدخل رمز التحقق' };

  const row = await db.prepare('SELECT * FROM otps WHERE phone = ? AND purpose = ? ORDER BY id DESC LIMIT 1').get(key, purpose);
  if (!row) return { ok: false, error: 'لا يوجد رمز تحقق مرسل لهذا الرقم' };
  if (row.used) return { ok: false, error: 'الرمز مستخدم مسبقاً — أرسل رمزاً جديداً' };
  if (Date.now() > row.expires_at) return { ok: false, error: 'انتهت صلاحية الرمز — أرسل رمزاً جديداً' };

  row.attempts = (row.attempts || 0) + 1;
  if (row.attempts >= 5) {
    await db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(row.id);
    return { ok: false, error: 'محاولات كثيرة خاطئة — أرسل رمزاً جديداً' };
  }

  if (String(row.code) !== String(code).trim()) {
    await db.prepare('UPDATE otps SET attempts = ? WHERE id = ?').run(row.attempts, row.id);
    return { ok: false, error: 'الرمز غير صحيح — حاول مجدداً' };
  }

  await db.prepare('UPDATE otps SET used = 1, attempts = ? WHERE id = ?').run(row.attempts, row.id);

  const token = jwt.sign({ phoneKey: key, purpose }, SECRET, { expiresIn: '15m' });
  return { ok: true, token, purpose };
}

/** التحقق من توكن الرمز (يسبق إنشاء الحساب أو الدخول) */
function checkOtpToken(token, key, purpose) {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload && payload.phoneKey === key && payload.purpose === purpose ? payload : null;
  } catch {
    return null;
  }
}

module.exports = { requestOtp, verifyOtp, checkOtpToken, phoneKey, toE164, OTP_TTL_MS };