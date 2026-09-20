import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const { requireAuth, errorResponse } = require('../../../../lib/auth');
const coach = require('../../../../lib/coach');

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const list = await db.prepare(`
      SELECT ct.id, ct.team_name, ct.league, ct.budget, u.id as user_id, u.name as user_name,
        (SELECT COALESCE(SUM(wp.points), 0)
          FROM coach_squad cs JOIN coach_week_points wp ON wp.player_id = cs.player_id
          WHERE cs.team_id = ct.id) as total_points,
        (SELECT p.name FROM players p WHERE p.id = ct.captain_player_id) as captain_name
      FROM coach_teams ct JOIN users u ON u.id = ct.user_id
      ORDER BY total_points DESC, ct.budget DESC
    `).all();

    const myTeam = await db.prepare('SELECT id FROM coach_teams WHERE user_id = ?').get(user.id);
    const rank = myTeam ? list.findIndex((t) => t.id === myTeam.id) + 1 : null;

    return NextResponse.json({ list, my_rank: rank });
  } catch (e) {
    return errorResponse(e);
  }
}