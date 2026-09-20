import { NextResponse } from 'next/server';
import { QUESTIONS, pickRandomQuestions } from '../../../../lib/questions';
const { requireAuth } = require('../../../../lib/auth');
const { claim } = require('../../../../lib/rewards');
const db = require('../../../../lib/db');

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    // أسئلة عشوائية — تختلف من مشترك لآخر، مع عدم كشف الإجابات الصحيحة
    const randomQuestions = pickRandomQuestions(8);
    const rows = await db.prepare("SELECT day FROM rewards_claims WHERE user_id = ? AND action = 'question'").all(user.id);
    const claimed = rows.map((r) => r.day);
    return NextResponse.json({
      questions: randomQuestions.map((q) => ({
        id: q.id,
        q: q.q,
        options: q.options,
        bombs: q.bombs,
      })),
      claimed,
      totalInPool: 64,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { qid, answer } = await req.json();
    const q = QUESTIONS.find((x) => x.id === qid);
    if (!q) {
      return NextResponse.json({ error: 'سؤال غير موجود' }, { status: 400 });
    }
    if (typeof answer !== 'number' || answer < 0 || answer >= q.options.ar.length) {
      return NextResponse.json({ error: 'إجابة غير صحيحة' }, { status: 400 });
    }
    const correct = answer === q.correct;
    if (!correct) {
      return NextResponse.json({ correct, correctIndex: q.correct });
    }
    const res = await claim(user.id, 'question', qid, q.bombs);
    return NextResponse.json({ correct: true, claimed: res.claimed, bombs: res.bombs, earned: res.claimed ? q.bombs : 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}