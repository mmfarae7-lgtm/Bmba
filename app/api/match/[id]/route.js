import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const match = await db.prepare(`
      SELECT m.*, l.name as league_name, l.country as league_country, l.logo_url as league_logo
      FROM matches m LEFT JOIN leagues l ON m.league_id = l.id
      WHERE m.id = ?
    `).get(id);

    if (!match) {
      return NextResponse.json({ error: 'المباراة غير موجودة' }, { status: 404 });
    }

    // الترتيب: من المباريات المنتهية في نفس البطولة
    let standings = [];
    if (match.league_id) {
      const finished = await db.prepare(`
        SELECT home_team, away_team, home_score, away_score
        FROM matches WHERE league_id = ? AND status = 'finished'
      `).all(match.league_id) || [];

      const table = {};
      const upsert = (team) => {
        if (!table[team]) {
          table[team] = { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
        }
        return table[team];
      };

      finished.forEach((m) => {
        const h = upsert(m.home_team);
        const a = upsert(m.away_team);
        h.played += 1; a.played += 1;
        h.gf += m.home_score; h.ga += m.away_score;
        a.gf += m.away_score; a.ga += m.home_score;
        if (m.home_score > m.away_score) { h.won += 1; h.pts += 3; a.lost += 1; }
        else if (m.home_score < m.away_score) { a.won += 1; a.pts += 3; h.lost += 1; }
        else { h.drawn += 1; a.drawn += 1; h.pts += 1; a.pts += 1; }
      });

      standings = Object.values(table)
        .map((r) => ({ ...r, gd: r.gf - r.ga }))
        .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf)
        .slice(0, 12)
        .map((r, i) => ({ ...r, pos: i + 1 }));
    }

    // النتائج السابقة بين الفريقين
    const h2h = await db.prepare(`
      SELECT home_team, away_team, home_score, away_score, match_date, status
      FROM matches
      WHERE status = 'finished'
        AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      ORDER BY match_date DESC LIMIT 8
    `).all(match.home_team, match.away_team, match.away_team, match.home_team) || [];

    // نتائج الفريقين السابقة (آخر 5 لكل فريق)
    const lastResults = await db.prepare(`
      SELECT home_team, away_team, home_score, away_score, match_date
      FROM matches
      WHERE status = 'finished' AND (home_team = ? OR away_team = ?)
      ORDER BY match_date DESC LIMIT 10
    `).all(match.home_team, match.home_team);

    const lastResultsAway = await db.prepare(`
      SELECT home_team, away_team, home_score, away_score, match_date
      FROM matches
      WHERE status = 'finished' AND (home_team = ? OR away_team = ?)
      ORDER BY match_date DESC LIMIT 10
    `).all(match.away_team, match.away_team);

    const formMark = (team, rows) => {
      return rows.slice(0, 5).map((r) => {
        if (r.home_team === team) {
          return r.home_score > r.away_score ? 'W' : r.home_score === r.away_score ? 'D' : 'L';
        }
        return r.away_score > r.home_score ? 'W' : r.away_score === r.home_score ? 'D' : 'L';
      });
    };

    // إحصائيات التوقعات
    const preds = await db.prepare(`
      SELECT p.id, p.home_score, p.away_score, p.points_earned, p.unique_bonus,
             u.name as user_name, u.avatar as user_avatar, u.points as user_points
      FROM predictions p JOIN users u ON p.user_id = u.id
      WHERE p.match_id = ? ORDER BY p.created_at ASC
    `).all(id) || [];

    const total = preds.length;
    const homeW = preds.filter((p) => p.home_score > p.away_score).length;
    const draws = preds.filter((p) => p.home_score === p.away_score).length;
    const awayW = preds.filter((p) => p.home_score < p.away_score).length;
    const correct = preds.filter((p) => p.points_earned > 0).length;
    const wrong = total - correct;
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

    return NextResponse.json({
      match,
      standings,
      h2h,
      formHome: formMark(match.home_team, lastResults),
      formAway: formMark(match.away_team, lastResultsAway),
      preds,
      stats: {
        total,
        homeW,
        draw: draws,
        awayW,
        correct,
        wrong,
        pctHomeW: pct(homeW),
        pctDraw: pct(draws),
        pctAwayW: pct(awayW),
        pctCorrect: pct(correct),
        pctWrong: pct(wrong),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}