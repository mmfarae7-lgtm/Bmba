import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../../../lib/auth');

export async function POST(req) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.email || body.phone || body.name;
    const { password } = body;
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
    const res = NextResponse.json({ 
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email, points: user.points, role: user.role, avatar: user.avatar, phone_code: user.phone_code, country: user.country, gender: user.gender, birth_date: user.birth_date, bombs: user.bombs, invite_code: user.invite_code, invited_by: user.invited_by, notifications: user.notifications, blocked: user.blocked }
    });
    res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
    res.cookies.set('bomba-onboarded', '1', { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}