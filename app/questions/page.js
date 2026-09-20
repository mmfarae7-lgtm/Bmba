'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

export default function Questions() {
  const { t, lang } = useI18n();
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [answered, setAnswered] = useState({});
  const [toast, setToast] = useState('');
  const [bombs, setBombs] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      setUser(d.user);
      if (d.user && !d.user.guest) setBombs(Number(d.user.bombs || 0));
    }).catch(() => {});
    fetch('/api/rewards/questions').then((r) => r.json()).then((d) => {
      setQuestions(d.questions || []);
      const map = {};
      (d.claimed || []).forEach((id) => { map[id] = 'claimed'; });
      setAnswered((a) => ({ ...map, ...a }));
      if (typeof d.bombs === 'number') setBombs(d.bombs);
    }).catch(() => {});
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  const answer = async (q, idx) => {
    if (answered[q.id]) return;
    const res = await fetch('/api/rewards/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qid: q.id, answer: idx }),
    });
    const d = await res.json();
    if (d.correct === true && d.claimed) {
      setAnswered((a) => ({ ...a, [q.id]: { correct: idx } }));
      if (typeof d.bombs === 'number') setBombs(d.bombs);
      showToast(t('qs_correct').replace('{bombs}', q.bombs));
    } else if (d.correct === true && !d.claimed) {
      setAnswered((a) => ({ ...a, [q.id]: { correct: idx } }));
      showToast(t('qs_claimed'));
    } else if (d.correct === false) {
      setAnswered((a) => ({ ...a, [q.id]: { wrong: idx, correctIndex: d.correctIndex } }));
      const opts = q.options[lang === 'en' ? 'en' : 'ar'];
      showToast(t('qs_wrong').replace('{answer}', opts[d.correctIndex]));
    }
  };

  const signed = user && !user.guest;
  const isClaimed = (state) => state === 'claimed' || typeof state === 'object';

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>📝 <span className="grad">{t('qs_title')}</span></h1>
          <p>{t('qs_subtitle')}</p>
          <p style={{ color: 'var(--gold)', fontWeight: 800, marginTop: 6 }}>🪙 {bombs !== null ? bombs : '...'}</p>
        </div>

        {!signed ? (
          <div className="empty-state">
            <div className="icon">📝</div>
            <p>{t('rw_login')}</p>
            <Link href="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 12, color: '#fff' }}>
              {t('nav_login')}
            </Link>
          </div>
        ) : !questions ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <>
            <p className="rw-hint" style={{ marginBottom: 10 }}>
              🔀 {t('qs_vary')}
            </p>
            {questions.map((q) => {
              const text = q.q[lang === 'en' ? 'en' : 'ar'];
              const opts = q.options[lang === 'en' ? 'en' : 'ar'];
              const state = answered[q.id];
              const done = isClaimed(state);
              return (
                <div className={`qs-card ${state && state.wrong !== undefined ? 'wrong' : ''}`} key={q.id}>
                  <div className="qs-q">{text}</div>
                  <div className="qs-opts">
                    {opts.map((opt, i) => (
                      <button
                        type="button"
                        key={i}
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
                    {state === 'claimed' && <span className="qs-res ok">✓ {t('qs_answered')} (+{q.bombs} 🪙)</span>}
                    {done && state !== 'claimed' && state.correct !== undefined && <span className="qs-res ok">✓ {t('qs_answered')} (+{q.bombs} 🪙)</span>}
                    {state && state.wrong !== undefined && <span className="qs-res bad">{t('qs_wrong_short')}</span>}
                    <span className="qs-res" style={{ color: 'var(--gold)' }}>+{q.bombs} 🪙</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}