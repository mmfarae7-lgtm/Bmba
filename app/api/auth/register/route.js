import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../../../lib/auth');

export async function POST(req) {
  try {
    const { name, phone, phone_code, country, gender, birth_date, avatar, email, password, invite_code } = await req.json();
    const trimmedName = String(name || '').trim();
    if (!trimmedName || !password) {
      return NextResponse.json({ error: 'أدخل جميع البيانات المطلوبة' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' }, { status: 400 });
    }
    if (!phone && !email) {
      return NextResponse.json({ error: 'أدخل رقم الجوال أو البريد الإلكتروني' }, { status: 400 });
    }
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    let finalPhone = phone ? String(phone).trim().replace(/[^\d+]/g, '') : null;
    if (!finalPhone) {
      const existingWithEmail = await db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existingWithEmail) {
        return NextResponse.json({ error: 'البريد الإلكتروني مسجل مسبقاً' }, { status: 409 });
      }
      finalPhone = 'u' + Date.now() + Math.floor(Math.random() * 1000);
    } else {
      const existing = await db.prepare('SELECT id FROM users WHERE phone = ? OR email = ?').get(finalPhone, normalizedEmail || '');
      if (existing) {
        return NextResponse.json({ error: 'رقم الجوال أو البريد مسجل مسبقاً' }, { status: 409 });
      }
    }
    const safeGender = gender === 'male' || gender === 'female' ? String(gender) : null;
    const safeAvatar = avatar && typeof avatar === 'string' && avatar.length <= 3000000 ? String(avatar) : null;

    const inviteCode = invite_code ? String(invite_code).trim().toUpperCase() : null;
    let inviter = null;
    if (inviteCode) {
      inviter = await db.prepare('SELECT id, name FROM users WHERE invite_code = ? AND blocked = 0').get(inviteCode);
      if (!inviter) {
        return NextResponse.json({ error: 'كود الدعوة غير صحيح' }, { status: 400 });
      }
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.prepare('INSERT INTO users (name, phone, email, password, avatar, phone_code, country, gender, birth_date, invited_by, bombs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(trimmedName, finalPhone, normalizedEmail, hash, safeAvatar, phone_code ? String(phone_code) : null, country ? String(country) : null, safeGender, birth_date ? String(birth_date) : null, inviter ? String(inviter.id) : null, 0);
    const newId = result.lastInsertRowid;

    // هدية الاشتراك الأول: 100 بمبا
    const WELCOME_BOMBS = 100;
    await db.prepare('UPDATE users SET bombs = bombs + ? WHERE id = ?').run(WELCOME_BOMBS, newId);
    await db.prepare("INSERT OR IGNORE INTO rewards_claims (user_id, action, day, bombs) VALUES (?, 'welcome', '1', ?)").run(newId, WELCOME_BOMBS);

    const myCode = 'BM' + trimmedName.replace(/\s+/g, '').toUpperCase().slice(0, 4) + newId;
    await db.prepare('UPDATE users SET invite_code = ? WHERE id = ?').run(myCode, newId);

    if (inviter) {
      await db.prepare('UPDATE users SET bombs = bombs + 10 WHERE id = ?').run(inviter.id);
      await db.prepare('UPDATE users SET bombs = bombs + 5 WHERE id = ?').run(newId);
      await db.prepare("INSERT INTO rewards_claims (user_id, action, day, bombs) VALUES (?, 'invite', ?, 10)").run(inviter.id, myCode);
      await db.prepare("INSERT INTO rewards_claims (user_id, action, day, bombs) VALUES (?, 'invite', ?, 5)").run(newId, inviter.id + ':' + myCode);
    }

    const user = { id: newId, name: trimmedName, phone: finalPhone, email: normalizedEmail, points: 0, role: 'user', avatar: safeAvatar, country, gender: safeGender, birth_date, bombs: (inviter ? 5 : 0) + WELCOME_BOMBS, invite_code: myCode };
    const token = generateToken(user);
    const res = NextResponse.json({ user });
    res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
    res.cookies.set('bomba-onboarded', '1', { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}