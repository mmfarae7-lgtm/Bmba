'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';

const POS_LABEL = { GK: 'حارس', DEF: 'مدافع', MID: 'وسط', FWD: 'مهاجم' };
const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD'];

export default function CoachPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [league, setLeague] = useState('');
  const [tab, setTab] = useState('squad');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/coach');
      if (res.ok) setData(await res.json());
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

  const act = async (body, done) => {
    setBusy(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) { showToast(d.message); await load(); if (done) done(d); }
      else showToast(d.error || 'فشلت العملية');
    } catch { showToast('خطأ في الاتصال'); }
    setBusy(false);
  };

  const create = (e) => {
    e.preventDefault();
    act({ action: 'create', team_name: teamName, league });
  };

  const signed = user && !user.guest;

  if (!signed) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <div className="page-header">
            <h1>🧢 <span className="grad">أنت المدرب</span></h1>
            <p>كوّن فريقك من نجوم العالم، شاهد أسماءك تثير المباريات، واربح حسب أداء لاعبيك</p>
          </div>
          <div className="empty-state">
            <div className="icon">🧢</div>
            <p>سجّل الدخول للبدء بتشكيل فريقك</p>
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

  if (!data.team) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <div className="page-header">
            <h1>🧢 <span className="grad">أنت المدرب</span></h1>
            <p>اختر دوريك وشكّل فريقك الأول — رصيدك الافتتاحي 20,000 بمبة 🪙</p>
          </div>

          <div className="sec-card chal-hint" style={{ marginBottom: 16 }}>
            <div>📋 كيف تلعب؟</div>
            <ul style={{ margin: '8px 0 0 18px', padding: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <li>اختر الدوري ثم كوّن فريقك من أفضل اللاعبين</li>
              <li>كل لاعب يسجّل هدفاً أو صناعة يضيف نقاطاً لرصيدك</li>
              <li>يُسمح بثلاثة لاعبين من النادي الواحد فقط</li>
              <li>تشكيلة من 15 لاعباً واختيار الكابتن</li>
              <li>3 تعديلات أسبوعياً تلقائياً</li>
            </ul>
          </div>

          <div className="sec-card">
            <h3>🚀 تشكيل فريقك</h3>
            <form onSubmit={create} style={{ display: 'grid', gap: 12 }}>
              <div className="form-group">
                <label>اسم الفريق</label>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="مثال: أسود الرياض 🦁" required maxLength={30} />
              </div>
              <div className="form-group">
                <label>الدوري</label>
                <select value={league} onChange={(e) => setLeague(e.target.value)} required>
                  <option value="">— اختر الدوري —</option>
                  {Object.entries(data.leagues).map(([k, L]) => (
                    <option key={k} value={k} disabled={data.league_counts[k] === 0}>
                      {L.icon} {L.name} ({data.league_counts[k]} لاعب)
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={busy}>
                {busy ? 'جارٍ الإنشاء…' : 'ابدأ التحدي 🧢'}
              </button>
            </form>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  const { team, squad, budget, total_points: _tp, week, transfers, limits } = data;
  const squadByPos = {};
  for (const p of squad) {
    if (!squadByPos[p.position]) squadByPos[p.position] = [];
    squadByPos[p.position].push(p);
  }
  const ownedIds = squad.map((p) => p.id);
  const market = (data.market || []).filter((p) => !p.owned);

  const transfersLeft = limits.weekly_transfers - (transfers.buys + transfers.sells);

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>🧢 <span className="grad">{team.team_name}</span></h1>
          <p>{data.leagues[team.league]?.icon} {data.leagues[team.league]?.name}</p>
        </div>

        <div className="stat-grid">
          <div className="live-stat">
            <div className="label">الرصيد</div>
            <div className="value gold" style={{ color: 'var(--gold)', fontWeight: 800 }}>{budget.toLocaleString()} 🪙</div>
          </div>
          <div className="live-stat">
            <div className="label">نقاطي</div>
            <div className="value">{data.my_score?.points ?? 0}</div>
          </div>
          <div className="live-stat">
            <div className="label">الترتيب</div>
            <div className="value">#{data.my_score?.rank ?? '—'}</div>
          </div>
          <div className="live-stat">
            <div className="label">التعديلات هذا الأسبوع</div>
            <div className="value">{transfersLeft >= 0 ? transfersLeft : 0} 🔄</div>
          </div>
        </div>

        <div className="tabs" style={{ margin: '14px 0' }}>
          <button className={tab === 'squad' ? 'active' : ''} onClick={() => setTab('squad')}>🧑‍🏫 تشكيلتي ({squad.length}/15)</button>
          <button className={tab === 'market' ? 'active' : ''} onClick={() => setTab('market')}>🛒 السوق</button>
          <button className={tab === 'rank' ? 'active' : ''} onClick={() => setTab('rank')}>🏅 الترتيب</button>
        </div>

        {tab === 'squad' && (
          <div style={{ display: 'grid', gap: 14 }}>
            {POS_ORDER.map((pos) => {
              const list = squadByPos[pos] || [];
              if (list.length === 0) return null;
              return (
                <div key={pos}>
                  <h4 style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{POS_LABEL[pos]}</h4>
                  <div className="hub-grid" style={{ gridTemplateColumns: '1fr' }}>
                    {list.map((p) => (
                      <div key={p.id} className="sec-card" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700 }}>
                            {p.name}
                            {p.is_captain && <span className="badge badge-superadmin" style={{ marginInlineStart: 6 }}>كابتن ⭐</span>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.club} • نُقاطه: {p.points}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {!p.is_captain && (
                            <button type="button" className="btn-sm btn-outline" disabled={busy} onClick={() => act({ action: 'captain', player_id: p.id })}>كابتن</button>
                          )}
                          <button type="button" className="btn-sm btn-danger" disabled={busy || transfersLeft <= 0} onClick={() => act({ action: 'sell', player_id: p.id })}>
                            بيع ({p.bought_price} 🪙)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {squad.length === 0 && (
              <div className="empty-state">
                <div className="icon">🧢</div>
                <p>تشكيلتك فارغة — ابدأ من السوق 🛒</p>
              </div>
            )}
          </div>
        )}

        {tab === 'market' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              💡 السعر = القيمة السوقية × 10 بمبة • بيع اللاعب يسترد القيمة المدفوعة
            </p>
            {market.map((p) => (
              <div key={p.id} className="sec-card" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {p.club} • {POS_LABEL[p.position]} • القيمة: {p.market_value_m}M
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{p.price_bombs.toLocaleString()} 🪙</span>
                  <button
                    type="button"
                    className="btn-sm btn-success"
                    disabled={busy || ownedIds.includes(p.id) || transfersLeft <= 0 || budget < p.price_bombs || squad.length >= limits.squad_size}
                    onClick={() => act({ action: 'buy', player_id: p.id })}
                  >
                    شراء
                  </button>
                </div>
              </div>
            ))}
            {market.length === 0 && (
              <div className="empty-state">
                <div className="icon">🛒</div>
                <p>لا مزيد من اللاعبين المتاحين في هذا الدوري</p>
              </div>
            )}
          </div>
        )}

        {tab === 'rank' && (
          <Leaderboard />
        )}

        <Link href="/challenges" className="hub-go" style={{ display: 'block', marginTop: 16 }}>← كل التحديات</Link>
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    fetch('/api/coach/leaderboard').then((r) => r.json()).then((d) => setRows(d)).catch(() => {});
  }, []);
  if (!rows) return <div className="loading"><div className="spinner"></div></div>;
  return (
    <div className="sec-card" style={{ padding: 8 }}>
      {rows.list.length === 0 ? (
        <div className="empty-state"><div className="icon">🏅</div><p>لا توجد فرق بعد — كن أول المدربين!</p></div>
      ) : (
        rows.list.map((r, i) => (
          <div key={r.id} className={`lb-row ${r.user_id ? '' : ''}`}>
            <span className="lb-rank">{i + 1}</span>
            <span className="lb-name">
              <b>{r.team_name}</b> <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>— {r.user_name}</span>
              {r.captain_name && <div style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>كابتن: {r.captain_name}</div>}
            </span>
            <span className="lb-pts" dir="ltr">{r.total_points} ⭐</span>
          </div>
        ))
      )}
    </div>
  );
}