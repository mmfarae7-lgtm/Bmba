import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { TOURNAMENTS } = require('../../../lib/tournaments');

function matchesTournament(t, row) {
  if (t.ids.length && t.ids.includes(row.api_id)) return true;
  return t.names.some((n) => n === row.name);
}

export async function GET() {
  try {
    const rows = await db.prepare(`
      SELECT l.api_id, l.name, COUNT(m.id) as matches,
             SUM(CASE WHEN m.status = 'finished' THEN 1 ELSE 0 END) as finished,
             SUM(CASE WHEN m.status = 'live' THEN 1 ELSE 0 END) as live,
             SUM(CASE WHEN m.status = 'upcoming' THEN 1 ELSE 0 END) as upcoming
      FROM leagues l
      LEFT JOIN matches m ON m.league_id = l.id
      GROUP BY l.id
    `).all();

    const result = TOURNAMENTS.map((t) => {
      let matches = 0, finished = 0, live = 0, upcoming = 0;
      rows.forEach((r) => {
        if (matchesTournament(t, r)) {
          matches += Number(r.matches) || 0;
          finished += Number(r.finished) || 0;
          live += Number(r.live) || 0;
          upcoming += Number(r.upcoming) || 0;
        }
      });
      return {
        slug: t.slug,
        name: t.name,
        emoji: t.emoji,
        matches,
        finished,
        live,
        upcoming,
        found: matches > 0,
      };
    });

    return NextResponse.json({ tournaments: result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}