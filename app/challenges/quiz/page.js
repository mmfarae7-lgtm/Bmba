'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';

export default function QuizPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [answered, setAnswered] = useState({});
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/rewards/questions');
      if (res.ok) {
        const d = await res.json();
        setData(d);
        const map = {};
        for (const id of d.claimed) map[id] = 'claimed';
        setAnswered(map);
      }
    } catch {}
  };

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
    load();
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  const answer = async (q, idx) => {
    if (answered[q.id]) return;
    try {
      const res = await fetch('/api/rewards/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qid: q.id, answer: idx }),
      });
      const d = await res.json();
      if (d.correct === true && d.claimed) {
        setAnswered((a) => ({ ...a, [q.id]: { correct: idx } }));
        showToast(`إجابة صحيحة! ربحت +${q.bombs} بمبات 🎉`);
      } else if (d.correct === true) {
        setAnswered((a) => ({ ...a, [q.id]: { correct: idx } }));
        showToast('أجبت عن هذا السؤال سابقاً');
      } else {
        setAnswered((a) => ({ ...a, [q.id]: { wrong: idx, correctIndex: d.correctIndex } }));
        showToast(`إجابة خاطئة — الصحيح: ${q.options.ar[d.correctIndex]}`);
      }
    } catch { showToast('خطأ في الاتصال'); }
  };

  const signed = user && !user.guest;
  const isDone = (state) => state === 'claimed' || typeof state === 'object';

  if (!signed) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <div className="page-header">
            <h1>❓ <span className="grad">جاوب واكسب</span></h1>
            <p>أسئلة رياضية متنوعة — الجواب الصحيح يكسبك بمبات</p>
          </div>
          <div className="empty-state">
            <div className="icon">❓</div>
            <p>سجّل الدخول للمشاركة</p>
            <Link href="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 12, color: '#fff' }}>تسجيل الدخول</Link>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container"><div className="loading"><div className="spinner"></div></div></div>
        <BottomNav />
      </>
    );
  }

  const claimedCount = data.claimed.length;

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>❓ <span className="grad">جاوب واكسب</span></h1>
          <p>أجب صحيحاً واربح بمبات لكل سؤال • جاوبت عن {claimedCount} من {data.totalInPool ?? data.questions.length}</p>
        </div>

        {data.questions.map((q) => {
          const state = answered[q.id];
          const opts = q.options.ar;
          const done = isDone(state);
          return (
            <div key={q.id} className="qs-card">
              <div className="qs-q">{q.q.ar}</div>
              <div className="qs-opts">
                {opts.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`qs-opt ${
                      done && state.correct !== undefined && i === state.correct ? 'good' : ''
                    } ${
                      state && state.wrong !== undefined && i === state.correctIndex ? 'good' : ''
                    } ${
                      state && state.wrong === i ? 'bad' : ''
                    }`}
                    disabled={done}
                    onClick={() => answer(q, i)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="qs-meta">
                {state === 'claimed' && <span className="qs-res ok">✓ جاوبت سابقاً (+{q.bombs} 🪙)</span>}
                {done && state !== 'claimed' && state.correct !== undefined && <span className="qs-res ok">✓ +{q.bombs} 🪙</span>}
                {state && state.wrong !== undefined && <span className="qs-res bad">إجابة خاطئة</span>}
                <span className="qs-res" style={{ color: 'var(--gold)' }}>+{q.bombs} 🪙</span>
              </div>
            </div>
          );
        })}

        <Link href="/challenges" className="hub-go" style={{ display: 'block', marginTop: 16 }}>← كل التحديات</Link>
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}