'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TopBar from '../../../../components/TopBar';
import BottomNav from '../../../../components/BottomNav';

export default function ArenaDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/arena/${id}`);
      if (res.ok) setData(await res.json());
      else if (res.status === 404) router.push('/challenges/arena');
      else if (res.status === 403) router.push('/challenges/arena');
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

  const savePred = async (matchId) => {
    const d = drafts[matchId];
    if (!d || d.hs === '' || d.as === '') return showToast('أدخل نتيجة التوقع');
    setBusy(true);
    try {
      const res = await fetch(`/api/arena/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, home_score: Number(d.hs), away_score: Number(d.as) }),
      });
      const r = await res.json();
      if (res.ok) { showToast(r.message); load(); }
      else showToast(r.error || 'فشل الحفظ');
    } catch { showToast('خطأ في الاتصال'); }
    setBusy(false);
  };

  const leave = async () => {
    if (!window.confirm('تأكيد الخروج من الحلبة؟')) return;
    await fetch(`/api/arena/${id}`, { method: 'DELETE' });
    router.push('/challenges/arena');
  };

  const refreshMatches = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/arena/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      });
      const r = await res.json();
      if (res.ok) { showToast(r.message + (r.added ? ` (+${r.added})` : '')); load(); }
      else showToast(r.error || 'تعذر التحديث');
    } catch { showToast('خطأ في الاتصال'); }
    setBusy(false);
  };

  if (!data) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container"><div className="loading"><div className="spinner"></div></div></div>
        <BottomNav />
      </>
    );
  }

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(data.arena.code); } catch {}
    showToast('تم نسخ الرمز ✓');
  };

  const me = data.members.find((m) => m.is_me);
  const isOwner = data.arena.owner_id === (user && user.id);

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>🎯 <span className="grad">{data.arena.name}</span></h1>
          <p>{data.arena.tag ? `#${data.arena.tag} • ` : ''}أنشأها {data.owner.name}</p>
        </div>

        <div className="sec-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>رمز الدعوة</div>
            <b dir="ltr" style={{ color: 'var(--gold)', fontSize: '1.4rem', letterSpacing: 3 }}>{data.arena.code}</b>
          </div>
          <button type="button" className="btn-outline" style={{ width: 'auto' }} onClick={copyCode}>نسخ الرمز</button>
          {isOwner && (
            <button type="button" className="btn-outline" style={{ width: 'auto' }} disabled={busy} onClick={refreshMatches}>🔄 تحديث المباريات</button>
          )}
          <button type="button" className="btn-sm btn-danger" onClick={leave}>{isOwner ? 'حذف الحلبة' : 'مغادرة الحلبة'}</button>
        </div>

        <h3 style={{ margin: '14px 0 10px' }}>🏆 ترتيب الأعضاء</h3>
        <div className="sec-card" style={{ padding: 6 }}>
          {data.members.map((m, i) => (
            <div key={m.id} className="lb-row">
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">
                {m.is_owner ? '👑 ' : ''}{m.name} {m.is_me && <span style={{ color: 'var(--accent)' }}>(أنت)</span>}
              </span>
              <span className="lb-pts" style={{ color: 'var(--gold)' }}>{m.arena_points} ⭐</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
          <h3 style={{ margin: 0 }}>⚽ مباريات الحلبة</h3>
          <span className="badge badge-count">نتيجة دقيقة = 5 ⭐ • فوز/تعادل صحيح = 2 ⭐</span>
        </div>

        {data.matches.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📅</div>
            <p>لا توجد مباريات قادمة في هذا الأسبوع — عد لاحقاً</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {data.matches.map(({ match, preds }) => {
              const myPred = data.my_predictions[match.id];
              const d = drafts[match.id] || { hs: myPred ? myPred.home_score : '', as: myPred ? myPred.away_score : '' };
              const finished = match.status === 'finished';
              return (
                <div key={match.id} className="sec-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-admin">{match.league_name || 'غير محدد'}</span>
                    {finished && <span className="badge">انتهت • {match.home_score} - {match.away_score}</span>}
                    {match.status === 'live' && <span className="badge badge-superadmin">مباشر {match.minute}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '10px 0', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, flex: 1 }}>{match.home_team}</div>
                    {!finished ? (
                      <div className="pred-stepper" dir="ltr">
                        <input inputMode="numeric" value={d.hs} onChange={(e) => setDrafts({ ...drafts, [match.id]: { hs: e.target.value, as: d.as } })} placeholder="0" />
                        <span>:</span>
                        <input inputMode="numeric" value={d.as} onChange={(e) => setDrafts({ ...drafts, [match.id]: { hs: d.hs, as: e.target.value } })} placeholder="0" />
                      </div>
                    ) : (
                      <span style={{ fontWeight: 900 }} dir="ltr">{match.home_score} - {match.away_score}</span>
                    )}
                    <div style={{ fontWeight: 700, flex: 1, textAlign: 'left' }}>{match.away_team}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                    {data.members.map((m) => {
                      const p = preds[m.id];
                      if (!p) return null;
                      const right = finished && p.home_score === match.home_score && p.away_score === match.away_score;
                      return (
                        <span key={m.id} className={`pred-chip ${right ? 'good' : ''}`}>
                          {m.name}: {p.home_score}-{p.away_score} {right && '✓'}
                        </span>
                      );
                    })}
                  </div>
                  {!finished && (
                    <button type="button" className="btn-sm btn-primary" style={{ width: 'auto' }} disabled={busy} onClick={() => savePred(match.id)}>
                      {myPred ? 'تحديث توقعك' : 'توقع الآن'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Link href="/challenges/arena" className="hub-go" style={{ display: 'block', marginTop: 16 }}>← كل الحلبات</Link>
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}