'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { useI18n } from '../lib/i18n';

export default function TopBar({ user }) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notif, setNotif] = useState(user && !user.guest ? user.notifications !== 0 : true);
  const [toast, setToast] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    if (user && !user.guest) setNotif(user.notifications !== 0);
  }, [user]);

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  };

  const toggleNotif = async () => {
    if (!user || user.guest) return;
    const next = !notif;
    setNotif(next);
    try {
      await fetch('/api/rewards/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {}
  };

  const shareApp = async () => {
    setMenuOpen(false);
    // المكافأة تُمنح فقط بعد مشاركة حقيقية من صفحة المكافئات
    if (user && !user.guest) {
      router.push('/rewards');
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: t('brand'), url: 'https://bmba-app.vercel.app' });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText('https://bmba-app.vercel.app');
      }
    } catch {}
  };

  const logout = async () => {
    setMenuOpen(false);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    router.push('/login');
    router.refresh();
  };

  const goBack = () => {
    try {
      if (window.history.length > 1) router.back();
      else router.push('/');
    } catch { router.push('/'); }
  };

  const signed = user && !user.guest;
  const points = signed ? Number(user.points || 0) : 0;
  const bombs = signed ? Number(user.bombs || 0) : 0;

  return (
    <nav className="topbar">
      <div className="topbar-coin">
        {user ? (
          <Link href="/rewards" className="coin-badge" title={t('rw_title')}>
            <img src="/coin.png" alt="بمبات" className="coin-img" />
            <span className="coin-val" dir="ltr">{bombs}</span>
          </Link>
        ) : (
          <Link href="/login" className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }}>
            {t('nav_login')}
          </Link>
        )}
      </div>

      <div className="topbar-center">
        <Link href="/" className="topbar-brand">
          <img src="/logo.png" alt="BMBA" className="topbar-logo" />
          <span className="topbar-title">{t('brand')}</span>
        </Link>
      </div>

      <div className="topbar-actions">
        {pathname !== '/' && (
          <button type="button" className="topbar-back" onClick={goBack} aria-label="رجوع" title="رجوع">
            →</button>
        )}
        {signed && (
          <button
            className={`bell ${notif ? 'on' : 'off'}`}
            onClick={toggleNotif}
            title={notif ? t('topb_notif_off') : t('topb_notif_on')}
          >
            {notif ? '🔔' : '🔕'}
          </button>
        )}

        <div className="topbar-menu" ref={menuRef}>
          <button type="button" className="topbar-profile-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="topbar-avatar">
              {signed && user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : signed ? (
                <span className="avatar-initial">{(user.name || '؟').charAt(0)}</span>
              ) : (
                <span className="avatar-ico">👤</span>
              )}
            </span>
            {signed && (
              <span className="topbar-pts">
                <span className="pts-num" dir="ltr">{points}</span>
                <span className="pts-lbl">{signed ? t('topb_pts') : ''}</span>
              </span>
            )}
            <span className="caret">▾</span>
          </button>

          {menuOpen && (
            <div className="topbar-dropdown">
              {signed && (
                <>
                  <Link href="/profile" className="dd-head" onClick={() => setMenuOpen(false)}>
                    <span className="topbar-avatar big">
                      {user.avatar ? <img src={user.avatar} alt="" /> : <span className="avatar-initial">{user.name.charAt(0)}</span>}
                    </span>
                    <div>
                      <div className="dd-name">{user.name}</div>
                      <div className="dd-role">{t('topb_profile')}</div>
                    </div>
                  </Link>
                  <div className="dd-divider" />
                </>
              )}

              <MenuItem icon="👤" label={t('topb_profile')} onClick={() => { setMenuOpen(false); router.push('/profile'); }} />
              <MenuItem icon="⚙️" label={t('menu_settings')} onClick={() => { setMenuOpen(false); router.push('/profile'); }} />
              <MenuItem icon="🛍️" label={t('menu_store')} onClick={() => { setMenuOpen(false); router.push('/store'); }} />

              <div className="dd-row">
                <span className="dd-ico">🌐</span>
                <span className="dd-label">{t('menu_lang')}</span>
                <div className="dd-toggle">
                  <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>عربي</button>
                  <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
                </div>
              </div>

              <div className="dd-row">
                <span className="dd-ico">🎨</span>
                <span className="dd-label">{t('menu_theme')}</span>
                <ThemeToggle />
              </div>

              <MenuItem icon="ℹ️" label={t('menu_info')} onClick={() => { setMenuOpen(false); router.push('/info'); }} />
              <MenuItem icon="📣" label={t('menu_follow')} onClick={() => { setMenuOpen(false); showToast(t('follow_soon')); }} />
              <MenuItem icon="📤" label={t('menu_share')} onClick={shareApp} />

              <div className="dd-row dd-here">
                <span className="dd-ico">📋</span>
                <span className="dd-label">{t('menu_data')}</span>
                <span className="caret">◀</span>
              </div>
              <div className="dd-sub">
                <MenuItem small icon="🔒" label={t('sub_privacy')} onClick={() => { setMenuOpen(false); router.push('/privacy'); }} />
                <MenuItem small icon="📜" label={t('sub_terms')} onClick={() => { setMenuOpen(false); router.push('/terms'); }} />
                <MenuItem small icon="❓" label={t('sub_faq')} onClick={() => { setMenuOpen(false); router.push('/faq'); }} />
                {signed && <MenuItem small danger icon="🚪" label={t('sub_logout')} onClick={logout} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="topbar-toast">{toast}</div>}
    </nav>
  );
}

function MenuItem({ icon, label, onClick, small, danger }) {
  return (
    <button type="button" className={`dd-item ${small ? 'small' : ''} ${danger ? 'danger' : ''}`} onClick={onClick}>
      <span className="dd-ico">{icon}</span>
      <span className="dd-label">{label}</span>
    </button>
  );
}