import { NextResponse } from 'next/server';
import { errorResponse } from '../../../lib/auth';
const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const coach = require('../../../lib/coach');

const LEAGUES = {
  EPL: { name: 'الدوري الإنجليزي الممتاز', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LIGA: { name: 'الدوري الإسباني', icon: '🇪🇸' },
  SAU: { name: 'دوري روشن السعودي', icon: '🇸🇦' },
};

async function marketFor(team) {
  const owned = await db.prepare('SELECT player_id FROM coach_squad WHERE team_id = ?').all(team.id);
  const ownedIds = owned.map((r) => r.player_id);
  const players = await db.prepare(
    'SELECT * FROM players WHERE league = ? AND active = 1 ORDER BY price_bombs DESC'
  ).all(team.league);
  return players.map((p) => ({ ...p, owned: ownedIds.includes(p.id) }));
}

async function squadDetail(teamId) {
  const squad = await db.prepare(`
    SELECT p.*, cs.bought_price FROM coach_squad cs
    JOIN players p ON p.id = cs.player_id
    WHERE cs.team_id = ? ORDER BY p.position, p.price_bombs DESC
  `).all(teamId);
  const res = await db.prepare(`
    SELECT p.id, p.name, p.club, p.position, p.league, COALESCE(SUM(wp.points), 0) as points
    FROM coach_squad cs
    JOIN players p ON p.id = cs.player_id
    LEFT JOIN coach_week_points wp ON wp.player_id = cs.player_id
    WHERE cs.team_id = ?
    GROUP BY p.id
  `).all(teamId);
  return res;
}

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const teamData = await coach.getTeam(user.id);
    const week = coach.currentWeek();
    let market = [];
    let myScore = { points: 0, rank: null };
    if (teamData) {
      market = await marketFor(teamData.team);
      const transfers = await coach.weekTransfers(teamData.team.id, week);
      const leaderboard = await db.prepare(`
        SELECT ct.id as team_id, ct.team_name, ct.budget,
          (SELECT COALESCE(SUM(wp.points), 0)
            FROM coach_squad cs JOIN coach_week_points wp ON wp.player_id = cs.player_id
            WHERE cs.team_id = ct.id) as total_points
        FROM coach_teams ct ORDER BY total_points DESC, ct.budget DESC
      `).all();
      const rankIdx = leaderboard.findIndex((t) => t.team_id === teamData.team.id);
      myScore = { points: rankIdx >= 0 ? leaderboard[rankIdx].total_points : 0, rank: rankIdx >= 0 ? rankIdx + 1 : null };
      return NextResponse.json({
        team: teamData.team,
        budget: teamData.team.budget,
        squad: teamData.players,
        total_points: teamData.total_points,
        week,
        transfers,
        limits: { squad_size: coach.SQUAD_SIZE, max_per_club: coach.MAX_PER_CLUB, weekly_transfers: coach.WEEKLY_TRANSFERS },
        market,
        leagues: LEAGUES,
        my_score: myScore,
      });
    }
    const leagueCounts = {};
    for (const key of Object.keys(LEAGUES)) {
      leagueCounts[key] = (await db.prepare('SELECT COUNT(*) as c FROM players WHERE league = ? AND active = 1').get(key)).c;
    }
    return NextResponse.json({ team: null, week, leagues: LEAGUES, league_counts: leagueCounts });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const action = String(body.action || 'create');

    const exists = await db.prepare('SELECT id FROM coach_teams WHERE user_id = ?').get(user.id);

    if (action === 'create') {
      if (exists) return NextResponse.json({ error: 'لديك فريق بالفعل' }, { status: 400 });
      const teamName = String(body.team_name || '').trim().slice(0, 30);
      const league = String(body.league || '');
      if (!teamName) return NextResponse.json({ error: 'اسم الفريق مطلوب' }, { status: 400 });
      if (!LEAGUES[league]) return NextResponse.json({ error: 'اختر الدوري' }, { status: 400 });
      const cnt = (await db.prepare('SELECT COUNT(*) as c FROM players WHERE league = ? AND active = 1').get(league)).c;
      if (cnt === 0) return NextResponse.json({ error: 'لا يوجد لاعبون في هذا الدوري بعد' }, { status: 400 });
      const res = await db.prepare('INSERT INTO coach_teams (user_id, team_name, league, budget) VALUES (?, ?, ?, ?)')
        .run(user.id, teamName, league, coach.STARTING_BUDGET);
      return NextResponse.json({ message: 'تم إنشاء فريقك 🧢 ابدأ بشراء اللاعبين', team_id: res.lastInsertRowid });
    }

    if (!exists) return NextResponse.json({ error: 'أنشئ فريقك أولاً' }, { status: 400 });
    const teamId = exists.id;
    const team = await db.prepare('SELECT * FROM coach_teams WHERE id = ?').get(teamId);
    const week = coach.currentWeek();
    const transfers = await coach.weekTransfers(teamId, week);

    if (action === 'buy') {
      const player = await db.prepare('SELECT * FROM players WHERE id = ? AND active = 1').get(Number(body.player_id));
      if (!player) return NextResponse.json({ error: 'اللاعب غير موجود' }, { status: 404 });
      if (player.league !== team.league) return NextResponse.json({ error: 'هذا اللاعب خارج دوريك' }, { status: 400 });

      const squad = await db.prepare('SELECT p.* FROM coach_squad cs JOIN players p ON p.id = cs.player_id WHERE cs.team_id = ?').all(teamId);
      if (squad.some((p) => p.id === player.id)) return NextResponse.json({ error: 'اللاعب موجود في تشكيلتك' }, { status: 400 });
      if (squad.length >= coach.SQUAD_SIZE) return NextResponse.json({ error: `اكتملت التشكيلة (${coach.SQUAD_SIZE} لاعب)` }, { status: 400 });
      const clubCount = squad.filter((p) => p.club === player.club).length;
      if (clubCount >= coach.MAX_PER_CLUB) return NextResponse.json({ error: `الحد الأقصى ${coach.MAX_PER_CLUB} لاعبين من ${player.club}` }, { status: 400 });
      if (transfers.buys >= coach.WEEKLY_TRANSFERS) return NextResponse.json({ error: `انتهت مشترياتك هذا الأسبوع (${coach.WEEKLY_TRANSFERS} كحد أقصى)` }, { status: 400 });
      if (team.budget < player.price_bombs) return NextResponse.json({ error: `رصيدك لا يكفي — تحتاج ${player.price_bombs} بمبة` }, { status: 400 });

      await db.prepare('INSERT INTO coach_squad (team_id, player_id, bought_price) VALUES (?, ?, ?)').run(teamId, player.id, player.price_bombs);
      await db.prepare('UPDATE coach_teams SET budget = budget - ? WHERE id = ?').run(player.price_bombs, teamId);
      await db.prepare('INSERT INTO coach_transfers (team_id, week, action, player_id, price) VALUES (?, ?, ?, ?, ?)').run(teamId, week, 'buy', player.id, player.price_bombs);
      return NextResponse.json({ message: `تم شراء ${player.name} بـ ${player.price_bombs} بمبة 🎉` });
    }

    if (action === 'sell') {
      const pid = Number(body.player_id);
      const row = await db.prepare('SELECT * FROM coach_squad WHERE team_id = ? AND player_id = ?').get(teamId, pid);
      if (!row) return NextResponse.json({ error: 'اللاعب ليس في تشكيلتك' }, { status: 404 });
      if (transfers.sells >= coach.WEEKLY_TRANSFERS) return NextResponse.json({ error: `انتهت مبيعاتك هذا الأسبوع (${coach.WEEKLY_TRANSFERS} كحد أقصى)` }, { status: 400 });
      const player = await db.prepare('SELECT * FROM players WHERE id = ?').get(pid);
      await db.prepare('DELETE FROM coach_squad WHERE team_id = ? AND player_id = ?').run(teamId, pid);
      await db.prepare('UPDATE coach_teams SET budget = budget + ?, captain_player_id = CASE WHEN captain_player_id = ? THEN NULL ELSE captain_player_id END WHERE id = ?')
        .run(row.bought_price, pid, teamId);
      await db.prepare('INSERT INTO coach_transfers (team_id, week, action, player_id, price) VALUES (?, ?, ?, ?, ?)').run(teamId, week, 'sell', pid, row.bought_price);
      return NextResponse.json({ message: `تم بيع ${player ? player.name : 'اللاعب'} وتراجع ${row.bought_price} بمبة` });
    }

    if (action === 'captain') {
      const pid = Number(body.player_id);
      const inSquad = await db.prepare('SELECT id FROM coach_squad WHERE team_id = ? AND player_id = ?').get(teamId, pid);
      if (!inSquad) return NextResponse.json({ error: 'اللاعب ليس في تشكيلتك' }, { status: 400 });
      await db.prepare('UPDATE coach_teams SET captain_player_id = ? WHERE id = ?').run(pid, teamId);
      return NextResponse.json({ message: 'تم تعيين الكابتن ⭐' });
    }

    if (action === 'delete') {
      await db.prepare('DELETE FROM coach_transfers WHERE team_id = ?').run(teamId);
      await db.prepare('DELETE FROM coach_squad WHERE team_id = ?').run(teamId);
      await db.prepare('DELETE FROM coach_teams WHERE id = ?').run(teamId);
      return NextResponse.json({ message: 'تم حذف فريقك' });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}