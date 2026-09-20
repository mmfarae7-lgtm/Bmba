import { NextResponse } from 'next/server';
const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { isMatchStarted, kickoffMs } = require('../../../lib/match-time');
const { teamNameAr } = require('../../../lib/team-names-ar');

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function isoUtc(sqlTs) {
  if (!sqlTs) return new Date().toISOString();
  return new Date(sqlTs.replace(' ', 'T') + 'Z').toISOString();
}

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const now = new Date();
    const nowMs = now.getTime();

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

    const preds = await db.prepare('SELECT match_id FROM predictions WHERE user_id = ?').all(user.id);
    const favs = await db.prepare('SELECT match_id FROM favorites WHERE user_id = ?').all(user.id);
    const predSet = new Set(preds.map((p) => p.match_id));
    const favSet = new Set(favs.map((f) => f.match_id));

    // ---------- 1) بدأت مباراة ----------
    const todayMatches = await db.prepare(`
      SELECT m.*, l.name as league_name
      FROM matches m
      LEFT JOIN leagues l ON m.league_id = l.id
      WHERE m.match_date = ?
      ORDER BY m.match_time
    `).all(today);

    const startEvents = [];
    for (const m of todayMatches) {
      const relevant = predSet.has(m.id) || favSet.has(m.id) || m.fire === 1 || m.featured === 1 || m.counts === 1;
      if (!relevant || m.status === 'finished') continue;
      const ko = kickoffMs(m);
      const justPassed = ko && nowMs >= ko && nowMs - ko < 30 * MIN;
      if (m.status === 'live' || justPassed) {
        startEvents.push({
          id: `start_${m.id}`,
          type: 'start',
          title: '⚽ بدأت المباراة',
          body: `${teamNameAr(m.home_team)} ضد ${teamNameAr(m.away_team)}${m.league_name ? ` — ${m.league_name}` : ''}`,
          link: '/',
          time: new Date().toISOString(),
        });
      }
    }

    // ---------- 2) توقع صحيح (من سجل النقاط) ----------
    const logs = await db.prepare(`
      SELECT * FROM point_logs
      WHERE user_id = ? AND points > 0 AND created_at > datetime('now', '-24 hours')
      ORDER BY id DESC LIMIT 30
    `).all(user.id);
    const pointEvents = [];
    for (const l of logs) {
      const isMatchReward = l.reason && (l.reason.includes('نتيجة دقيقة') || l.reason.includes('توقع وحيد'));
      if (!isMatchReward) continue;
      const cleanReason = (l.reason || '').replace(/^\S+ vs \S+: ?/, '');
      pointEvents.push({
        id: `pts_${l.id}`,
        type: 'points',
        title: `🎯 توقع صحيح! +${l.points} نقطة`,
        body: cleanReason,
        link: '/leaderboard',
        time: isoUtc(l.created_at),
      });
    }

    // ---------- 3) مباريات لم تتوقعها بعد ----------
    const todoEvents = [];
    for (const m of todayMatches) {
      const countable = m.counts === 1 || m.fire === 1 || m.featured === 1;
      if (!countable || predSet.has(m.id)) continue;
      if (isMatchStarted(m)) continue;
      const ko = kickoffMs(m);
      if (!ko) continue;
      const msToStart = ko - nowMs;
      const isSoon = msToStart <= 3 * HOUR && msToStart > 0;
      const isSpecial = m.fire === 1 || m.featured === 1;
      if (!isSoon && !isSpecial) continue;
      const fireLabel = m.fire === 1 ? ' 🔥نارية' : m.featured === 1 ? ' ⭐مميزة' : '';
      todoEvents.push({
        id: `todo_${m.id}`,
        type: 'todo',
        title: '⚠️ لم تتوقع بعد' + fireLabel,
        body: `${teamNameAr(m.home_team)} ضد ${teamNameAr(m.away_team)} — خلال ${formatCountdown(msToStart)}`,
        link: '/room',
        time: new Date().toISOString(),
      });
    }

    // ---------- 4) رسائل دردشة جديدة ----------
    const url = new URL(req.url);
    const afterMsgId = parseInt(url.searchParams.get('afterMsgId') || '0', 10);
    const chatEvents = [];
    if (afterMsgId > 0) {
      const msgs = await db.prepare(`
        SELECT m.*, u.name as user_name
        FROM messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.id > ? AND m.user_id != ? AND m.created_at > datetime('now', '-10 minutes')
        ORDER BY m.id ASC LIMIT 20
      `).all(afterMsgId, user.id);
      for (const msg of msgs) {
        chatEvents.push({
          id: `msg_${msg.id}`,
          type: 'chat',
          title: `💬 رسالة من ${msg.user_name}`,
          body: msg.content,
          link: '/chat',
          time: isoUtc(msg.created_at),
        });
      }
    }

    const events = [...pointEvents, ...startEvents, ...todoEvents, ...chatEvents];

    return NextResponse.json({
      events,
      now: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message, events: [] }, { status: e.status || 500 });
  }
}

function formatCountdown(ms) {
  const min = Math.max(1, Math.round(ms / MIN));
  if (min < 60) return `${min} دقيقة`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ساعة و ${m} دقيقة` : `${h} ساعة`;
}