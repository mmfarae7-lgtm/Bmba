const db = require('./db');

const STARTING_BUDGET = 20000;
const SQUAD_SIZE = 15;
const MAX_PER_CLUB = 3;
const WEEKLY_TRANSFERS = 3;

function currentWeek() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// نقاط الأداء حسب التحدي
// هدف = +5 | تمريرة حاسمة = +3 | شباك نظيفة حارس = +4 | شباك نظيفة مدافع = +3
// بطاقة صفراء = -1 | بطاقة حمراء = -3 | استقبال هدف (حارس) = -1
function scorePlayerStats(position, stats) {
  const s = stats || {};
  let pts = 0;
  pts += (s.goals || 0) * 5;
  pts += (s.assists || 0) * 3;
  if (position === 'GK' && s.clean_sheet) pts += 4;
  if (position === 'DEF' && s.clean_sheet) pts += 3;
  pts -= (s.yellow || 0) * 1;
  pts -= (s.red || 0) * 3;
  if (position === 'GK') pts -= (s.conceded || 0) * 1;
  return pts;
}

async function getTeam(userId) {
  const team = await db.prepare('SELECT * FROM coach_teams WHERE user_id = ?').get(userId);
  if (!team) return null;
  const squad = await db.prepare(`
    SELECT p.*, cs.bought_price, cs.id as squad_id
    FROM coach_squad cs JOIN players p ON p.id = cs.player_id
    WHERE cs.team_id = ? ORDER BY p.position, p.price_bombs DESC
  `).all(team.id);
  const pointsMap = await db.prepare(`
    SELECT wp.player_id, SUM(wp.points) as total FROM coach_week_points wp
    WHERE wp.player_id IN (${squad.map(() => '?').join(',') || 'NULL'})
    GROUP BY wp.player_id
  `).all(...squad.map((p) => p.id));
  const pointsById = {};
  for (const p of pointsMap) pointsById[p.player_id] = p.total || 0;
  const players = squad.map((p) => ({
    ...p,
    points: pointsById[p.id] || 0,
    is_captain: team.captain_player_id === p.id,
  }));
  const totalPoints = players.reduce((s, p) => s + p.points, 0);
  return { team, players, total_points: totalPoints };
}

async function weekTransfers(teamId, week) {
  const rows = await db.prepare('SELECT action FROM coach_transfers WHERE team_id = ? AND week = ?').all(teamId, week);
  return {
    buys: rows.filter((r) => r.action === 'buy').length,
    sells: rows.filter((r) => r.action === 'sell').length,
  };
}

function clubsOf(squad) {
  const count = {};
  for (const p of squad) count[p.club] = (count[p.club] || 0) + 1;
  return count;
}

module.exports = {
  STARTING_BUDGET,
  SQUAD_SIZE,
  MAX_PER_CLUB,
  WEEKLY_TRANSFERS,
  currentWeek,
  scorePlayerStats,
  getTeam,
  weekTransfers,
  clubsOf,
};