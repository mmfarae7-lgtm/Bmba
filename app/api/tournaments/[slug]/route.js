import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { getTournament } = require('../../../../lib/tournaments');

function trackTeam(teams, name, logo, gf, ga, winner) {
  const t = teams.get(name) || { name, logo: logo || '', played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, pts: 0, form: [] };
  t.played++;
  t.gf += gf;
  t.ga += ga;
  if (winner === 'W') { t.win++; t.pts += 3; t.form.push('W'); }
  else if (winner === 'L') { t.loss++; t.form.push('L'); }
  else { t.draw++; t.pts += 1; t.form.push('D'); }
  if (t.form.length > 5) t.form.splice(0, t.form.length - 5);
  teams.set(name, t);
}

export async function GET(req, ctx) {
  try {
    const { slug } = await ctx.params;
    const tournament = getTournament(slug);
    if (!tournament) {
      return NextResponse.json({ error: 'بطولة غير موجودة' }, { status: 404 });
    }

    const whereParts = [];
    const args = [];
    if (tournament.ids.length) {
      whereParts.push(`l.api_id IN (${tournament.ids.map(() => '?').join(',')})`);
      args.push(...tournament.ids);
    }
    if (tournament.names.length) {
      whereParts.push(`l.name IN (${tournament.names.map(() => '?').join(',')})`);
      args.push(...tournament.names);
    }
    if (whereParts.length === 0) {
      return NextResponse.json({ tournament: { slug: tournament.slug, ar: tournament.ar, en: tournament.en, emoji: tournament.emoji }, matches: [], standings: [], scorers: [], league: null, stats: { total: 0, finished: 0, live: 0, upcoming: 0, totalGoals: 0, avgGoals: 0 } });
    }
    const where = `(${whereParts.join(' OR ')})`;

    const matches = await db.prepare(`
      SELECT m.*, l.name as league_name, l.country as league_country, l.logo_url as league_logo
      FROM matches m
      LEFT JOIN leagues l ON m.league_id = l.id
      WHERE ${where}
      ORDER BY m.match_date DESC, m.match_time DESC
    `).all(...args);

    const league = await db.prepare(`
      SELECT id, name, country, logo_url FROM leagues l WHERE ${where} LIMIT 1
    `).get(...args);

    const finished = matches.filter((m) => m.status === 'finished');
    const teams = new Map();
    finished.forEach((m) => {
      const gh = (v) => v ?? 0;
      const hs = gh(m.home_score), as = gh(m.away_score);
      const res = hs === as ? 'D' : (hs > as ? 'W' : 'L');
      trackTeam(teams, m.home_team, m.home_logo, hs, as, res);
      trackTeam(teams, m.away_team, m.away_logo, as, hs, res === 'W' ? 'L' : (res === 'L' ? 'W' : 'D'));
    });

    const standings = [...teams.values()]
      .map((t) => ({ ...t, gd: t.gf - t.ga }))
      .sort((a, b) => (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf))
      .map((t, i) => ({ ...t, pos: i + 1 }));

    const scorers = [...teams.values()]
      .sort((a, b) => (b.gf - a.gf) || (b.played - a.played))
      .map((t, i) => ({ pos: i + 1, name: t.name, logo: t.logo, goals: t.gf, played: t.played }))
      .slice(0, 20);

    const matchesOut = matches.map((m) => ({
      id: m.id, home_team: m.home_team, away_team: m.away_team,
      home_logo: m.home_logo, away_logo: m.away_logo,
      home_score: m.home_score, away_score: m.away_score,
      status: m.status, match_date: m.match_date, match_time: m.match_time, minute: m.minute,
      fire: m.fire, points_value: m.points_value, custom_points: m.custom_points,
    }));

    const totalGoals = finished.reduce((s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
    const live = matches.filter((m) => m.status === 'live').length;
    const upcoming = matches.filter((m) => m.status === 'upcoming').length;

    return NextResponse.json({
      tournament: { slug: tournament.slug, ar: tournament.ar, en: tournament.en, emoji: tournament.emoji },
      league: league ? { name: league.name, country: league.country, logo: league.logo_url } : null,
      matches: matchesOut,
      standings,
      scorers,
      stats: {
        total: matches.length,
        finished: finished.length,
        live,
        upcoming,
        totalGoals,
        avgGoals: finished.length ? (totalGoals / finished.length).toFixed(1) : 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}