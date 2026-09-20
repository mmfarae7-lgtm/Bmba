'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';

const TAGS = ['', 'العائلة', 'الأصدقاء', 'الدوري الإنجليزي', 'الدوري الإسباني', 'دوري روشن', 'دوري أبطال أوروبا'];

export default function ArenaHub() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [code, setCode] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/arena');
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

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tag }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message);
        setName(''); setTag('');
        load();
      } else showToast(d.error || 'فشل الإنشاء');
    } catch { showToast('خطأ في الاتصال'); }
    setBusy(false);
  };

  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/arena/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (res.ok) showToast(d.message);
      else showToast(d.error || 'فشل الانضمام');
      setCode('');
      load();
    } catch { showToast('خطأ في الاتصال'); }
    setBusy(false);
  };

  const leave = async (a) => {
    if (!window.confirm('تأكيد الخروج من الحلبة؟')) return;
    try {
      const res = await fetch(`/api/arena/${a.id}`, { method: 'DELETE' });
      const d = await res.json();
      showToast(d.message);
      load();
    } catch {}
  };

  const signed = user && !user.guest;

  if (!signed) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <div className="page-header">
            <h1>🎯 <span className="grad">حلبة التوقعات</span></h1>
            <p>أنشئ حلبة خاصة بك وأصدقائك وتنافسوا في التوقعات</p>
          </div>
          <div className="empty-state">
            <div className="icon">🎯</div>
            <p>سجّل الدخول لإنشاء حلبة أو الانضمام لأصدقائك</p>
            <Link href="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 12, color: '#fff' }}>تسجيل الدخول</Link>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  const canCreate = !data || data.limits.owned < data.limits.max_owned;
  const canJoin = !data || data.limits.joined < data.limits.max_joined;

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>🎯 <span className="grad">حلبة التوقعات</span></h1>
          <p>أنشئ حلبة خاصة بك وأصدقائك • أدعُ عبر الرمز • تنافسوا بالنقاط</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <span className="badge badge-admin">حلباتك: {data ? data.limits.owned : 0}/{data?.limits?.max_owned || 1}</span>
          <span className="badge badge-count">مشترك في: {data ? data.limits.joined : 0}/{data?.limits?.max_joined || 2}</span>
        </div>

        {canCreate && (
          <div className="sec-card">
            <h3>➕ إنشاء حلبة جديدة</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
              لكل عضو حلبة واحدة فقط • المباريات حقيقية من API المباريات وتُربط بحلبتك خاصة — لا تُضاف للتوقعات العامة
            </p>
            <form onSubmit={create} style={{ display: 'grid', gap: 12 }}>
              <div className="form-group">
                <label>اسم الحلبة</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حلبة العائلة 🏠" required maxLength={40} />
              </div>
              <div className="form-group">
                <label>التصنيف</label>
                <select value={tag} onChange={(e) => setTag(e.target.value)}>
                  {TAGS.map((t) => <option key={t} value={t}>{t || '— بدون تصنيف —'}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={busy}>
                {busy ? 'جارٍ الإنشاء…' : 'إنشاء الحلبة 🎉'}
              </button>
            </form>
          </div>
        )}

        {!canCreate && (
          <div className="chal-hint">لقد أنشأت حلبتك الوحيدة — ادعُ أصدقاءك بالرمز لمضاعفة التحدي 🎯</div>
        )}

        {canJoin && (
          <div className="sec-card">
            <h3>🔑 الانضمام برمز</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
              اسأل صاحب الحلبة عن الرمز وأدخله هنا (يسمح بالاشتراك في حلبتين كحد أقصى)
            </p>
            <form onSubmit={join} style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>رمز الحلبة</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" dir="ltr" maxLength={10} required />
              </div>
              <button type="submit" className="btn-success" style={{ width: 'auto' }} disabled={busy}>
                انضمام
              </button>
            </form>
          </div>
        )}

        {!canJoin && (
          <div className="chal-hint">وصلت للحد الأقصى من الحلبات المشترك بها (حلبتان) 📌</div>
        )}

        <h3 style={{ margin: '8px 0 12px' }}>قائمة حلباتي</h3>

        {!data || data.all.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎯</div>
            <p>لا توجد حلبات بعد — أنشئ واحدة أو انضم برمز</p>
          </div>
        ) : (
          <div className="hub-grid" style={{ gridTemplateColumns: '1fr' }}>
            {data.all.map((a) => {
              const mine = a.owner_id === (user && user.id);
              return (
                <div key={a.id} className="sec-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                      {a.name}
                      {mine && <span className="badge badge-superadmin" style={{ marginInlineStart: 8 }}>حلبتك</span>}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                      {a.tag && `#${a.tag} • `}المالك: {a.owner_name} • الأعضاء: {a.members_count}
                    </div>
                    {mine && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>رمز الدعوة:</span>
                        <b dir="ltr" style={{ color: 'var(--gold)', letterSpacing: 2 }}>{a.code}</b>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link href={`/challenges/arena/${a.id}`} className="btn-sm btn-success">دخول الحلبة</Link>
                    <button type="button" className="btn-sm btn-danger" onClick={() => leave(a)}>
                      {mine ? 'حذف' : 'خروج'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}