import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const room = url.searchParams.get('room') || 'general';
    const before = url.searchParams.get('before');
    
    let query = `
      SELECT m.*, u.name as user_name, u.role as user_role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room = ?
    `;
    const params = [room];
    
    if (before) {
      query += ` AND m.id < ?`;
      params.push(before);
    }
    
    query += ` ORDER BY m.id DESC LIMIT 50`;
    const messages = (await db.prepare(query).all(...params)).reverse();
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { content, room } = await req.json();
    
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: 'الرسالة طويلة جداً' }, { status: 400 });
    }
    
    const result = await db.prepare('INSERT INTO messages (user_id, content, room) VALUES (?, ?, ?)').run(user.id, content.trim(), room || 'general');
    const message = await db.prepare(`
      SELECT m.*, u.name as user_name, u.role as user_role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);
    
    return NextResponse.json({ message });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}