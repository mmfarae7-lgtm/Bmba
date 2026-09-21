'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

export default function BombaStorePage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [gifts, setGifts] = useState(null);
  const [balance, setBalance] = useState(0);
  const [tab, setTab] = useState('gifts');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [lastCode, setLastCode] = useState(null);

  const loadGifts = async () => {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const d = await res.json();
        setGifts(d);
        if (typeof d.balance === 'number') setBalance(d.balance);
      }
    } catch {}
  };

  const load = async () => {
    try {
      const res = await fetch('/api/bomba-store');
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
    loadGifts();
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3200);
  };

  const buyGift = async (item) => {
    setBusyId('gift-' + item.id);
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
        loadGifts();
      } else showToast(d.error || 'فشلت العملية');
    } catch { showToast('خطأ في الاتصال'); }
    setBusyId(null);
  };

  const redeem = async (voucher) => {
    setBusyId(voucher.id);
    setLastCode(null);
    try {
      const res = await fetch('/api/bomba-store/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucher_id: voucher.id }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(`تم استبدال القسيمة بنجاح 🎉`);
        setLastCode(d.voucher);
        if (typeof d.balance === 'number') setBalance(d.balance);
        load();
      } else showToast(d.error || 'فشل الاستبدال');
    } catch { showToast('خطأ في الاتصال'); }
    setBusyId(null);
  };

  const signed = user && !user.guest;

  if (!signed) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <div className="page-header">
            <h1>🛍️ <span className="grad">متجر بمبا</span></h1>
            <p>منتجات رياضية وشركاء وخصومات حتى 70%</p>
          </div>
          <div className="empty-state">
            <div className="icon">🛍️</div>
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
          <h1>🛍️ <span className="grad">متجر بمبا</span></h1>
          <p>ملابس وأدوات رياضية من محلاتنا الشريكة • استبدل بمباتك بقسائم وخصومات تصل إلى 70%</p>
        </div>

        <div className="rw-balance" style={{ marginBottom: 16 }}>
          <img src="/coin.png" alt="بمبات" className="rw-coin-img" />
          <div>
            <div className="rw-balance-lbl">رصيد بمباتك</div>
            <div className="rw-balance-num" dir="ltr">{balance.toLocaleString()}</div>
          </div>
        </div>

        <div className="hub-tabs" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
          <button type="button" className={`btn-sm ${tab === 'gifts' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('gifts')}>🎁 الجوائز</button>
          <button type="button" className={`btn-sm ${tab === 'products' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('products')}>👕 المنتجات</button>
          <button type="button" className={`btn-sm ${tab === 'merchants' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('merchants')}>🏬 الشركاء</button>
          <button type="button" className={`btn-sm ${tab === 'vouchers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('vouchers')}>🎟️ القسائم والخصومات</button>
          <button type="button" className={`btn-sm ${tab === 'mine' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('mine')}>📦 قسائمي</button>
        </div>

        {!data ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <>
            {/* ——— الجوائز (المتجر القديم مدمجاً) ——— */}
            {tab === 'gifts' && (
              <>
                {!gifts ? (
                  <div className="loading"><div className="spinner"></div></div>
                ) : (
                  <>
                    <div className="chal-hint" style={{ marginBottom: 12 }}>
                      💡 جوائز داخل التطبيق تشتريها بمباتك (بمبات، ألقاب، حماية توقع…)
                    </div>
                    <div className="hub-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                      {(gifts.items || []).map((item) => {
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
                              disabled={busyId === 'gift-' + item.id || !canAfford || item.purchased}
                              onClick={() => buyGift(item)}
                            >
                              {busyId === 'gift-' + item.id ? 'جارٍ الشراء…' : item.purchased ? 'تم الشراء' : canAfford ? 'اشترِ' : 'رصيد غير كافٍ'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <h3 style={{ margin: '18px 0 10px' }}>📦 مشترياتي</h3>
                    {!gifts.purchases || gifts.purchases.length === 0 ? (
                      <div className="chal-hint">لم تشترِ جائزة بعد — ابدأ الآن 🎁</div>
                    ) : (
                      <div className="sec-card" style={{ padding: 6 }}>
                        {gifts.purchases.map((p) => (
                          <div key={p.id} className="lb-row">
                            <span className="lb-name">{p.icon} {p.title}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString('ar')}</span>
                            <span className="lb-pts" dir="ltr">-{p.price} 🪙</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ——— المنتجات ——— */}
            {tab === 'products' && (
              <>
                {data.products.length === 0 ? (
                  <div className="chal-hint">لا توجد منتجات بعد — قريباً من محلاتنا الشريكة 🏬</div>
                ) : (
                  <div className="hub-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                    {data.products.map((pr) => (
                      <div key={pr.id} className="sec-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '2.4rem' }}>{pr.image || '👕'}</div>
                        <div style={{ fontWeight: 800 }}>{pr.name}</div>
                        {pr.brand && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{pr.brand}</div>}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flex: 1 }}>{pr.description}</div>
                        <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '0.95rem' }}>{pr.price_sar} ر.س</div>
                        {pr.merchant_name && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {pr.merchant_logo} {pr.merchant_name}
                          </div>
                        )}
                        {pr.discount_label && (
                          <span className="chal-hint" style={{ padding: '2px 8px', display: 'inline-block' }}>🔥 {pr.discount_label}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ——— الشركاء ——— */}
            {tab === 'merchants' && (
              <>
                {data.merchants.length === 0 ? (
                  <div className="chal-hint">لا يوجد شركاء بعد — نسّق معنا لعرض محلك 🏪</div>
                ) : (
                  <div className="hub-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                    {data.merchants.map((m) => (
                      <div key={m.id} className="sec-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '2.8rem' }}>{m.logo || '🏪'}</div>
                        <div style={{ fontWeight: 800 }}>{m.name}</div>
                        <div style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 700 }}>
                          {m.type === 'shop' ? '🏬 متجر رياضي' : m.type === 'restaurant' ? '🍽️ مطعم/كافيه' : '🛒 متجر'}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flex: 1 }}>{m.category}</div>
                        {m.location && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📍 {m.location}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ——— القسائم والخصومات ——— */}
            {tab === 'vouchers' && (
              <>
                {data.vouchers.length === 0 ? (
                  <div className="chal-hint">لا توجد قسائم بعد — اشترك معنا واربح خصومات 🔥</div>
                ) : (
                  <div className="hub-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {data.vouchers.map((v) => {
                      const canAfford = balance >= v.cost_bombs;
                      const isDiscount = v.type === 'discount';
                      return (
                        <div key={v.id} className="sec-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: '2.2rem' }}>{isDiscount ? `🔥 ${v.discount}%` : '🎁'}</div>
                          <div style={{ fontWeight: 800 }}>{v.title}</div>
                          {v.merchant_name && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {v.merchant_logo} {v.merchant_name}
                            </div>
                          )}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flex: 1 }}>{v.description}</div>
                          <div style={{ color: 'var(--gold)', fontWeight: 800 }}>{v.cost_bombs.toLocaleString()} 🪙</div>
                          <button
                            type="button"
                            className={`btn-sm ${canAfford ? 'btn-success' : 'btn-outline'}`}
                            disabled={busyId === v.id || !canAfford}
                            onClick={() => redeem(v)}
                          >
                            {busyId === v.id ? 'جارٍ الاستبدال…' : canAfford ? 'استبدل' : 'رصيد غير كافٍ'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ——— قسائمي ——— */}
            {tab === 'mine' && (
              <>
                {lastCode && (
                  <div className="sec-card" style={{ marginBottom: 14, textAlign: 'center', border: '2px solid var(--gold)', padding: 14 }}>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>🎉 قسيمتك الجديدة جاهزة!</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: 2, color: 'var(--gold)' }} dir="ltr">{lastCode.code}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>أظهر الكود صاحب المحل أو المطعم عند الاستخدام</div>
                  </div>
                )}
                <h3 style={{ margin: '6px 0 10px' }}>📦 قسائمي ({data.myVouchers.length})</h3>
                {data.myVouchers.length === 0 ? (
                  <div className="chal-hint">لم تستبدل قسيمة بعد — جرّب تبويب «القسائم والخصومات» 🎟️</div>
                ) : (
                  <div className="sec-card" style={{ padding: 6 }}>
                    {data.myVouchers.map((uv) => (
                      <div key={uv.id} className="lb-row">
                        <span className="lb-name">
                          {uv.used ? '✅' : '🎟️'} {uv.title}
                          {uv.merchant_name ? ` — ${uv.merchant_logo} ${uv.merchant_name}` : ''}
                        </span>
                        <span className="lb-code" dir="ltr" style={{ fontWeight: 800, color: uv.used ? 'var(--text-muted)' : 'var(--gold)', fontSize: '0.85rem' }}>{uv.code}</span>
                        <span className="lb-pts" style={{ color: uv.used ? 'var(--text-muted)' : 'var(--success)' }}>{uv.used ? 'مستخدَمة' : 'فعالة'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}