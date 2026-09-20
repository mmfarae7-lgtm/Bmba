import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const sports = require('../../../lib/sports-api');

let weekSyncPending = false;

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

    if ((await sports.isEnabled()) && date !== 'all') {
      try {
        const target = date || today;
        await sports.syncDate(target);
        await sports.refreshLiveCached();
      } catch (e) {
        // ignore sync errors, show existing data
      }

      // Background: sync week on first load of today (non-blocking, once per 6h)
      if (!date && !weekSyncPending) {
        const lastSync = await db.prepare("SELECT value FROM settings WHERE key = 'sports_api_week_sync'").get();
        const lastTime = lastSync ? new Date(lastSync.value).getTime() : 0;
        const sixHours = 6 * 60 * 60 * 1000;
        if (Date.now() - lastTime > sixHours) {
          weekSyncPending = true;
          db.prepare("INSERT INTO settings (key, value) VALUES ('sports_api_week_sync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(new Date().toISOString())
            .then(() => sports.syncWeek())
            .catch(() => {})
            .finally(() => { weekSyncPending = false; });
        }
      }
    }

    const target = date || today;
    const matches = await db.prepare(`
      SELECT m.*, l.name as league_name, l.country as league_country, l.logo_url as league_logo,
             (SELECT COUNT(*) FROM predictions p WHERE p.match_id = m.id) as pred_total,
             (SELECT COUNT(*) FROM predictions p WHERE p.match_id = m.id AND p.points_earned > 0) as pred_correct
      FROM matches m
      LEFT JOIN leagues l ON m.league_id = l.id
      WHERE m.match_date = ?
      ORDER BY l.priority, m.match_time
    `).all(target);

    return NextResponse.json({ matches, date: target, sync: await sports.getStatus() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}