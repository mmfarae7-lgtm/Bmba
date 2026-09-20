import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../../../lib/auth');
const { checkOtpToken, phoneKey } = require('../../../../lib/otp');

function makeUser(user) {
  return {
    id: user.id, name: user.name, phone: user.phone, email: user.email, points: user.points,
    role: user.role, avatar: user.avatar, phone_code: user.phone_code, country: user.country,
    gender: user.gender, birth_date: user.birth_date, bombs: user.bombs, invite_code: user.invite_code,
    invited_by: user.invited_by, notifications: user.notifications, blocked: user.blocked,
    google_id: user.google_id, facebook_id: user.facebook_id,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.email || body.phone || body.name;
    const { password } = body;

    // --- الدخول برمز SMS/واتساب (OTP) ---
    if (body.otp_token) {
      if (!body.phone || !body.phone_code) {
        return NextResponse.json({ error: 'أدخل رقم الجوال' }, { status: 400 });
      }
      const key = phoneKey(body.phone, body.phone_code);
      const payload = checkOtpToken(body.otp_token, key, 'login');
      if (!payload) {
        return NextResponse.json({ error: 'انتهت صلاحية رمز التحقق — أعد إرساله' }, { status: 400 });
      }
      const digits = String(body.phone).replace(/[^\d+]/g, '');
      const user = await db.prepare('SELECT * FROM users WHERE phone = ?').get(digits);
      if (!user) {
        return NextResponse.json({ error: 'لا يوجد حساب بهذا الرقم — سجّل أولاً' }, { status: 404 });
      }
      if (user.blocked) {
        return NextResponse.json({ error: 'الحساب محظور' }, { status: 403 });
      }
      const token = generateToken(user);
      const res = NextResponse.json({ user: makeUser(user) });
      res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
      res.cookies.set('bomba-onboarded', '1', { maxAge: 60 * 60 * 24 * 365, path: '/' });
      return res;
    }

    // --- الدخول العادي (بريد/جوال/اسم + كلمة مرور) ---
    if (!identifier || !password) {
      return NextResponse.json({ error: 'أدخل البريد أو رقم الجوال وكلمة المرور' }, { status: 400 });
    }
    const user = await db.prepare('SELECT * FROM users WHERE phone = ? OR email = ? OR name = ?').get(identifier, identifier, identifier);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'البريد/الجوال أو كلمة المرور غير صحيحة' }, { status: 401 });
    }
    if (user.blocked) {
      return NextResponse.json({ error: 'الحساب محظور' }, { status: 403 });
    }
    const token = generateToken(user);
    const res = NextResponse.json({ user: makeUser(user) });
    res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
    res.cookies.set('bomba-onboarded', '1', { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}