'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';

const CAT_ORDER = ['champion', 'top_scorer', 'best_player'];

export default function ChampionsPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [league, setLeague] = useState('EPL');
  const [selected, setSelected] = useState({});
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [answered, setAnswered] = useState({});

  const loadAnswers = (d) => {
    const map = {};
    const ans = d.answers[league] || {};
    for (const c of Object.keys(ans)) map[c] = ans[c];
    setSelected(map);
    setAnswered(map);
    setData(d);
  };

  const load = async () => {
    try {
      const res = await fetch('/api/champions');
      if (res.ok) loadAnswers(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
    load();
  }, []);

  useEffect(() => {
    if (data) {
      const map = {};
      const ans = data.answers[league] || {};
      for (const c of Object.keys(ans)) map[c] = ans[c];
      setSelected(map);
    }
  }, [league, data]);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  const save = async (category, answer) => {
    setBusy(true);
    try {
      const res = await fetch('/api/champions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league, category, answer }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message);
        setSelected((s) => ({ ...s, [category]: answer }));
        setAnswered((s) => ({ ...s, [category]: answer }));
      } else showToast(d.error || 'فشل الحفظ');
    } catch { showToast('خطأ في الاتصال'); }
    setBusy(false);
  };

  const signed = user && !user.guest;

  if (!signed) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <div className="page-header">
            <h1>👑 <span className="grad">تحدي الأبطال</span></h1>
            <p>توقّع أبطال الموسم والهدافين وأفضل لاعب واربح بمبات في نهاية الموسم</p>
          </div>
          <div className="empty-state">
            <div className="icon">👑</div>
            <p>سجّل الدخول للمشاركة في التحدي</p>
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

  let badgeCount = 0;
  for (const L of Object.keys(data.badges || {})) badgeCount += Object.keys(data.badges[L] || {}).length;

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>👑 <span className="grad">تحدي الأبطال</span></h1>
          <p>أجب عن التوقعات الموسمية • المصيبون يحصلون على بمبات في نهاية الموسم 🏁</p>
        </div>

        {badgeCount > 0 && (
          <div className="success-msg" style={{ marginBottom: 14 }}>
            🏆 أنت ربحت جوائز {badgeCount} توقعات — تابع الباقي!
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(data.leagues).map(([key, L]) => (
            <button
              key={key}
              type="button"
              className={league === key ? 'btn-sm btn-success' : 'btn-sm btn-outline'}
              onClick={() => setLeague(key)}
            >
              {L.icon} {L.name}
            </button>
          ))}
        </div>

        {CAT_ORDER.map((cat) => {
          const catMeta = data.categories[cat];
          const myAnswer = selected[cat];
          const result = data.results[league]?.[cat];
          const won = result && myAnswer === result.winner;
          const options = data.options[league]?.[cat] || [];
          return (
            <div key={cat} className="sec-card">
              <h3>{catMeta.icon} {catMeta.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{catMeta.hint}</p>

              {result && (
                <div className={won ? 'success-msg' : 'chal-hint'} style={{ marginBottom: 10 }}>
                  {result.winner === myAnswer
                    ? `فزت! الجائزة +${result.award_bombs} بمبة 🎉`
                    : `انتهى التصويت: ${result.winner} فاز بالجائزة (+${result.award_bombs} بمبة)`}
                </div>
              )}

              <div className="opt-grid">
                {options.map((opt) => {
                  const isSel = myAnswer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`opt-chip ${answered[cat] === opt ? 'saved' : ''} ${isSel ? 'sel' : ''}`}
                      onClick={() => save(cat, opt)}
                      disabled={busy || !!result}
                    >
                      {isSel && '✓ '}{opt}
                    </button>
                  );
                })}
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