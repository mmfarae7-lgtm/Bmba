'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';

export default function StorePage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [balance, setBalance] = useState(0);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setBalance(d.balance);
      }
    } catch {}
  };

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      setUser(d.user);
      setBalance(Number(d.user?.bombs || 0));
    }).catch(() => {});
    load();
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  const buy = async (item) => {
    setBusy(true);
    try {
      const res = await fetch('/api/store/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      });
      const d = await res.json();
      if (res.ok) {
        if (typeof d.balance === 'number') setBalance(d.balance);
        showToast(d.bonus_bombs ? `${d.message} (+${d.bonus_bombs} بمبة)` : d.message);
        load();
      } else showToast(d.error || 'فشلت العملية');
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
            <h1>🛒 <span className="grad">المتجر</span></h1>
            <p>استبدل بمباتك بجوائز ومكافآت حصرية</p>
          </div>
          <div className="empty-state">
            <div className="icon">🛒</div>
            <p>سجّل الدخول للوصول إلى المتجر</p>
            <Link href="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 12, color: '#fff' }}>تسجيل الدخول</Link>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>🛒 <span className="grad">المتجر</span></h1>
          <p>كل العمليات تتم بمبات التطبيق • العناصر الفورية تُضاف مباشرة لرصيدك</p>
        </div>

        <div className="rw-balance" style={{ marginBottom: 16 }}>
          <img src="/coin.png" alt="بمبات" className="rw-coin-img" />
          <div>
            <div className="rw-balance-lbl">رصيد بمباتك</div>
            <div className="rw-balance-num" dir="ltr">{balance.toLocaleString()}</div>
          </div>
        </div>

        {!data ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <>
            <div className="hub-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {data.items.map((item) => {
                const canAfford = balance >= item.price;
                return (
                  <div key={item.id} className="sec-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '2rem' }}>{item.icon}</div>
                    <div style={{ fontWeight: 800 }}>{item.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flex: 1 }}>{item.description}</div>
                    <div style={{ color: 'var(--gold)', fontWeight: 800 }}>{item.price.toLocaleString()} 🪙</div>
                    <button
                      type="button"
                      className={`btn-sm ${canAfford && !item.purchased ? 'btn-success' : 'btn-outline'}`}
                      disabled={busy || !canAfford || item.purchased}
                      onClick={() => buy(item)}
                    >
                      {item.purchased ? 'تم الشراء' : canAfford ? 'شراء' : 'رصيد غير كافٍ'}
                    </button>
                  </div>
                );
              })}
            </div>

            <h3 style={{ margin: '18px 0 10px' }}>📦 مشترياتي الأخيرة</h3>
            {data.purchases.length === 0 ? (
              <div className="chal-hint">لم تشترِ بعد — ابدأ الآن 🛍️</div>
            ) : (
              <div className="sec-card" style={{ padding: 6 }}>
                {data.purchases.map((p) => (
                  <div key={p.id} className="lb-row">
                    <span className="lb-name">{p.icon} {p.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString('ar')}</span>
                    <span className="lb-pts" dir="ltr">-{p.price} 🪙</span>
                  </div>
                ))}
              </div>
            )}

            <Link href="/challenges" className="hub-go" style={{ display: 'block', marginTop: 16 }}>← كل التحديات</Link>
          </>
        )}
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}