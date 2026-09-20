'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

const APP_URL = 'https://bmba-app.vercel.app';

// مشاركة حقيقية فقط: navigator.share لا يُكمل إلا إذا تمت المشاركة فعلاً.
// على الحاسوب نتأكد أن نافذة المشاركة فُتحت فعلاً قبل المكافأة.
async function realShare({ title, text, fallbackText }) {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (nav?.share) {
    try {
      await nav.share({ title, text, url: text.match(/https?:\/\/\S+/) ? text.match(/https?:\/\/\S+/)[0] : APP_URL });
      return { shared: true, method: 'native' };
    } catch {
      return { shared: false }; // المستخدم ألغى المشاركة — لا مكافأة
    }
  }
  // حاسوب بدون Web Share API: نسخ الرابط + فتح نافذة مشاركة فعلية
  try {
    if (nav?.clipboard) {
      try {
        await nav.clipboard.writeText(text.match(/https?:\/\/\S+/) ? text.match(/https?:\/\/\S+/)[0] : APP_URL);
      } catch {}
    }
    const encoded = encodeURIComponent(fallbackText);
    const pop = window.open('https://wa.me/?text=' + encoded, '_blank', 'width=560,height=520');
    if (!pop) return { shared: false };
    return { shared: true, method: 'popup' };
  } catch {
    return { shared: false };
  }
}

export default function Rewards() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [bombs, setBombs] = useState(0);
  const [invite, setInvite] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (d) => {
        setUser(d.user);
        if (d.user && !d.user.guest) {
          setBombs(Number(d.user.bombs || 0));
          try {
            const res = await fetch('/api/rewards/invite');
            const inv = await res.json();
            if (inv.code) setInvite(inv.code);
            if (typeof inv.bombs === 'number') setBombs(inv.bombs);
          } catch {}
        }
        setLoading(false);
      });
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3200);
  };

  const claimAd = async () => {
    // حالياً لا توجد إعلانات — لا تُمنح بمبات بمجرد الضغط
    showToast(t('rw_ads_none'));
  };

  const claimShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const shareUrl = APP_URL + (invite ? '/?ref=' + invite : '');
      const text = `${invite ? `كود دعوتي: ${invite} — ` : ''}${t('brand')} ${shareUrl}`;
      const r = await realShare({ title: t('brand'), text, fallbackText: text });
      if (!r.shared) {
        showToast(t('rw_share_cancel'));
        return;
      }
      const res = await fetch('/api/rewards/share', { method: 'POST' });
      const d = await res.json();
      if (typeof d.bombs === 'number') setBombs(d.bombs);
      if (d.claimed) showToast(t('rw_share_done'));
      else if (d.bombs !== undefined && !d.claimed) showToast(t('rw_share_claimed'));
    } catch {
      showToast(t('rw_share_cancel'));
    } finally {
      setSharing(false);
    }
  };

  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(invite); } catch {}
    showToast(t('rw_invite_copied'));
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL + (invite ? '/?ref=' + invite : ''));
      showToast(t('rw_share_copied'));
    } catch {}
  };

  const signed = user && !user.guest;

  if (loading) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container"><div className="loading"><div className="spinner"></div></div></div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>🪙 <span className="grad">{t('rw_title')}</span></h1>
          <p>{t('rw_subtitle')}</p>
        </div>

        {!signed ? (
          <div className="empty-state">
            <div className="icon">🪙</div>
            <p>{t('rw_login')}</p>
            <Link href="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 12, color: '#fff' }}>
              {t('nav_login')}
            </Link>
          </div>
        ) : (
          <>
            <div className="rw-balance">
              <img src="/coin.png" alt="بمبات" className="rw-coin-img" />
              <div>
                <div className="rw-balance-lbl">{t('rw_balance')}</div>
                <div className="rw-balance-num" dir="ltr">{bombs}</div>
              </div>
            </div>
            <p className="rw-hint" style={{ marginTop: 8 }}>{t('rw_welcome')}</p>

            <div className="rw-grid">
              <button type="button" className="rw-card" onClick={claimAd}>
                <span className="rw-emoji">🎬</span>
                <span className="rw-title">{t('rw_ads')}</span>
                <span className="rw-sub">{t('rw_ads_sub')}</span>
                <span className="rw-cta">{t('rw_ads_btn')}</span>
              </button>

              <Link href="/questions" className="rw-card">
                <span className="rw-emoji">📝</span>
                <span className="rw-title">{t('rw_q')}</span>
                <span className="rw-sub">{t('rw_q_sub')}</span>
                <span className="rw-cta">{t('rw_q_btn')}</span>
              </Link>

              <button type="button" className="rw-card" onClick={claimShare} disabled={sharing}>
                <span className="rw-emoji">📤</span>
                <span className="rw-title">{t('rw_share')}</span>
                <span className="rw-sub">{t('rw_share_sub')}</span>
                <span className="rw-cta">{sharing ? '...' : t('rw_share_btn')}</span>
              </button>

              <div className="rw-card">
                <span className="rw-emoji">👥</span>
                <span className="rw-title">{t('rw_invite')}</span>
                <span className="rw-sub">{t('rw_invite_sub')}</span>
                <div className="rw-invite-box">
                  <span className="rw-invite-code" dir="ltr">{invite || '...'}</span>
                  <button type="button" className="rw-copy" onClick={copyInvite}>{t('rw_invite_copy')}</button>
                </div>
                <span className="rw-hint">{t('rw_invite_how')}</span>
                <button type="button" className="rw-copy" style={{ marginTop: 8 }} onClick={copyShareLink}>
                  🔗 {t('rw_link_copy')}
                </button>
              </div>

              <Link href="/challenges" className="rw-card">
                <span className="rw-emoji">🔥</span>
                <span className="rw-title">{t('rw_challenges')}</span>
                <span className="rw-sub">{t('rw_challenges_sub')}</span>
                <span className="rw-cta">{t('rw_challenges_btn')}</span>
              </Link>
            </div>
          </>
        )}
      </div>
      {toast && <div className="topbar-toast">{toast}</div>}
      <BottomNav />
    </>
  );
}