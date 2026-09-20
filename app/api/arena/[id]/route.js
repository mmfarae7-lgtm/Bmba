import { NextResponse } from 'next/server';
const db = require('../../../../lib/db');
const arenaLib = require('../../../../lib/arena');
const { requireAuth, errorResponse } = require('../../../../lib/auth');

async function arenaPoints(arenaId, members) {
  const rows = await db.prepare(`
    SELECT ap.user_id, ap.match_id, ap.home_score, ap.away_score, m.status, m.home_score as mh, m.away_score as ma
    FROM arena_predictions ap
    JOIN matches m ON m.id = ap.match_id
    WHERE ap.arena_id = ?
  `).all(arenaId);
  const pts = {};
  for (const m of members) pts[m.id] = 0;
  for (const r of rows) {
    if (r.status !== 'finished') continue;
    let p = 0;
    if (r.home_score === r.mh && r.away_score === r.ma) p = 5;
    else {
      const o1 = r.home_score > r.away_score ? 'H' : r.home_score < r.away_score ? 'A' : 'D';
      const o2 = r.mh > r.ma ? 'H' : r.mh < r.ma ? 'A' : 'D';
      if (o1 === o2) p = 2;
    }
    pts[r.user_id] = (pts[r.user_id] || 0) + p;
  }
  return pts;
}

function chunkSize(n) {
  return new Array(n).fill('?').join(',');
}

export async function GET(req, { params }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const arena = await db.prepare('SELECT * FROM arenas WHERE id = ?').get(Number(id));
    if (!arena) return NextResponse.json({ error: 'الحلبة غير موجودة' }, { status: 404 });

    const isMember = await db.prepare('SELECT id FROM arena_members WHERE arena_id = ? AND user_id = ?').get(arena.id, user.id);
    if (!isMember) return NextResponse.json({ error: 'لست عضواً في هذه الحلبة' }, { status: 403 });

    const members = await db.prepare(`
      SELECT u.id, u.name, u.avatar, u.points, m.arena_id,
             (a.owner_id = u.id) as is_owner
      FROM arena_members m
      JOIN users u ON u.id = m.user_id
      JOIN arenas a ON a.id = m.arena_id
      WHERE m.arena_id = ?
      ORDER BY (a.owner_id = u.id) DESC, u.name
    `).all(arena.id);

    // مباريات الحلبة الخاصة (حقيقية من الـ API ومرتبطة بها فقط)
    // عند التأكد أن الحلبة لم تُربط بعد بأي مباراة (يفضّل من إنشاء الحلبة)
    const linkedCount = await db.prepare('SELECT COUNT(*) as c FROM arena_matches WHERE arena_id = ?').get(arena.id);
    if (!linkedCount || linkedCount.c === 0) {
      try {
        await arenaLib.attachArenaMatches(arena.id);
      } catch (e) {
        // استمرار بدون مباريات إذا تعذرت المزامنة
      }
    }
    const matches = await arenaLib.arenaMatches(arena.id);

    const predictions = await db.prepare(`
      SELECT * FROM arena_predictions WHERE arena_id = ?
    `).all(arena.id);
    const predByMatch = {};
    for (const p of predictions) {
      if (!predByMatch[p.match_id]) predByMatch[p.match_id] = {};
      predByMatch[p.match_id][p.user_id] = p;
    }

    const myPreds = await db.prepare(`
      SELECT match_id, home_score, away_score FROM arena_predictions
      WHERE arena_id = ? AND user_id = ?
    `).all(arena.id, user.id);
    const myPredMap = {};
    for (const p of myPreds) myPredMap[p.match_id] = p;

    const owner = await db.prepare('SELECT id, name FROM users WHERE id = ?').get(arena.owner_id);
    const pts = await arenaPoints(arena.id, members);

    return NextResponse.json({
      arena,
      owner,
      members: members.map((m) => ({ ...m, arena_points: pts[m.id] || 0, is_me: m.id === user.id })),
      matches: matches.map((m) => ({ match: m, preds: predByMatch[m.id] || {} })),
      my_predictions: myPredMap,
      me: { id: user.id },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req, { params }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const arena = await db.prepare('SELECT * FROM arenas WHERE id = ?').get(Number(id));
    if (!arena) return NextResponse.json({ error: 'الحلبة غير موجودة' }, { status: 404 });
    const isMember = await db.prepare('SELECT id FROM arena_members WHERE arena_id = ? AND user_id = ?').get(arena.id, user.id);
    if (!isMember) return NextResponse.json({ error: 'لست عضواً في هذه الحلبة' }, { status: 403 });

    const body = await req.json();

    // للمالك فقط: إعادة ربط أقرب المباريات القادمة من الـ API بالحلبة
    if (body.action === 'refresh' && arena.owner_id === user.id) {
      const added = await arenaLib.attachArenaMatches(arena.id);
      return NextResponse.json({ message: 'تم تحديث مباريات الحلبة', added });
    }

    const match = await db.prepare('SELECT * FROM matches WHERE id = ?').get(Number(body.match_id));
    if (!match) return NextResponse.json({ error: 'المباراة غير موجودة' }, { status: 404 });
    if (match.status === 'finished') return NextResponse.json({ error: 'انتهت المباراة — لا يمكن التوقع' }, { status: 400 });

    // المباراة يجب أن تكون خاصة بهذه الحلبة (مرتبطة بها)
    const privateMatch = await arenaLib.isArenaMatch(arena.id, match.id);
    if (!privateMatch) return NextResponse.json({ error: 'هذه المباراة ليست ضمن مباريات الحلبة' }, { status: 403 });

    const hs = Number(body.home_score);
    const as = Number(body.away_score);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0 || hs > 20 || as > 20) {
      return NextResponse.json({ error: 'أهداف غير صحيحة' }, { status: 400 });
    }

    await db.prepare(`
      INSERT INTO arena_predictions (arena_id, user_id, match_id, home_score, away_score)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(arena_id, user_id, match_id) DO UPDATE SET home_score = excluded.home_score, away_score = excluded.away_score
    `).run(arena.id, user.id, match.id, hs, as);

    return NextResponse.json({ message: 'تم حفظ توقعك 🎯' });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const arena = await db.prepare('SELECT * FROM arenas WHERE id = ?').get(Number(id));
    if (!arena) return NextResponse.json({ error: 'الحلبة غير موجودة' }, { status: 404 });

    const isMember = await db.prepare('SELECT id FROM arena_members WHERE arena_id = ? AND user_id = ?').get(arena.id, user.id);
    if (!isMember) return NextResponse.json({ error: 'لست عضواً في هذه الحلبة' }, { status: 403 });

    if (arena.owner_id === user.id) {
      await db.prepare('DELETE FROM arenas WHERE id = ?').run(arena.id);
      return NextResponse.json({ message: 'تم حذف الحلبة' });
    }
    await db.prepare('DELETE FROM arena_members WHERE arena_id = ? AND user_id = ?').run(arena.id, user.id);
    return NextResponse.json({ message: 'غادرت الحلبة' });
  } catch (e) {
    return errorResponse(e);
  }
}