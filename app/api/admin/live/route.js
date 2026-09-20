import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAdmin } = require('../../../../lib/auth');
const sports = require('../../../../lib/sports-api');

export async function GET(req) {
  try {
    await requireAdmin(req);
    const pending = await db.prepare("SELECT COUNT(*) as count FROM matches WHERE api_id IS NOT NULL AND status = 'upcoming' AND match_date >= date('now')").get();
    const knownLeagues = await db.prepare(
      "SELECT DISTINCT l.id as lid, l.name, l.logo_url, l.api_id, l.priority FROM leagues l JOIN matches m ON m.league_id = l.id WHERE l.api_id IS NOT NULL ORDER BY l.priority"
    ).all();
    return NextResponse.json({
      status: await sports.getStatus(),
      pending,
      knownLeagues,
      show_all: await sports.isShowAll(),
      shown_ids: (await sports.getShownLeagues()) || [],
      default_shown: sports.DEFAULT_SHOWN,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { key, enabled, show_all, shown_ids } = body;
    if (key !== undefined) {
      await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run('sports_api_key', String(key).trim());
      sports.clearCache();
    }
    if (enabled !== undefined) {
      await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run('sports_api_enabled', enabled ? '1' : '0');
    }
    if (show_all !== undefined) {
      const value = show_all
        ? '__all__'
        : JSON.stringify((Array.isArray(shown_ids) && shown_ids.length ? shown_ids : sports.DEFAULT_SHOWN).map(v => parseInt(v)).filter(n => !isNaN(n)));
      await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run('show_leagues', value);
      sports.clearCache();
      await sports.syncNow();
    }
    return NextResponse.json({ message: 'تم الحفظ', status: await sports.getStatus() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}