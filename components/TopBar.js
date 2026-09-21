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
  const [toast, setToast] = useState('');
  const [touchY, setTouchY] = useState(null);
  const [dragY, setDragY] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // قفل تمرير الصفحة خلف الـ Bottom Sheet على الجوال فقط
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia('(max-width: 480px)');
    const lock = () => {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('bomba-menu-open');
    };
    const unlock = () => {
      document.body.style.overflow = '';
      document.body.classList.remove('bomba-menu-open');
    };
    if (mq.matches) lock();
    const onChange = (e) => (e.matches ? lock() : unlock());
    mq.addEventListener('change', onChange);
    return () => { unlock(); mq.removeEventListener('change', onChange); };
  }, [menuOpen]);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
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

  // سحب لأسفل لإغلاق الـ Bottom Sheet (الجوال)
  const onTouchStart = (e) => {
    if (e.currentTarget.scrollTop <= 0) setTouchY(e.touches[0].clientY);
  };
  const onTouchMove = (e) => {
    if (touchY == null) return;
    const dy = e.touches[0].clientY - touchY;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 80) setMenuOpen(false);
    setDragY(0);
    setTouchY(null);
  };

  const go = (path) => { setMenuOpen(false); router.push(path); };

  const signed = user && !user.guest;
  const points = signed ? Number(user.points || 0) : 0;
  const bombs = signed ? Number(user.bombs || 0) : 0;

  return (
    <nav className="topbar" ref={menuRef}>
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

        <div className="topbar-menu">
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
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="topbar-backdrop" onClick={() => setMenuOpen(false)} />
          <div
            className="topbar-dropdown"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: dragY > 0 ? 'none' : undefined,
            }}
          >
            <div className="dd-grab" aria-hidden="true" />

            {signed && (
              <div className="dd-head-row">
                <Link href="/profile" className="dd-head" onClick={() => setMenuOpen(false)}>
                  <span className="topbar-avatar big">
                    {user.avatar ? <img src={user.avatar} alt="" /> : <span className="avatar-initial">{user.name.charAt(0)}</span>}
                  </span>
                  <div className="dd-head-info">
                    <div className="dd-name">{user.name}</div>
                    <div className="dd-stats">
                      <span className="dd-stat dd-stat-pts"><b dir="ltr">{points.toLocaleString()}</b> {t('topb_pts')}</span>
                      <span className="dd-stat dd-stat-bombs"><b dir="ltr">{bombs.toLocaleString()}</b> {t('topb_bombs')}</span>
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  className="dd-close"
                  aria-label={t('dd_close')}
                  onClick={() => setMenuOpen(false)}
                >✕</button>
              </div>
            )}
            <div className="dd-divider" />

            <div className="dd-body">
              <div className="dd-sec-title">{t('dd_sec_account')}</div>
              <MenuItem icon="👤" label={t('topb_profile')} onClick={() => go('/profile')} />
              <MenuItem icon="⚙️" label={t('menu_settings')} onClick={() => go('/profile')} />
              <MenuItem icon="🛍️" label={t('menu_store')} onClick={() => go('/store')} />

              <div className="dd-sec-title">{t('dd_sec_prefs')}</div>
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

              <div className="dd-sec-title">{t('dd_sec_app')}</div>
              <MenuItem icon="ℹ️" label={t('menu_info')} onClick={() => go('/info')} />
              <MenuItem icon="📣" label={t('menu_follow')} onClick={() => { setMenuOpen(false); showToast(t('follow_soon')); }} />
              <MenuItem icon="📤" label={t('menu_share')} onClick={shareApp} />

              <div className="dd-sec-title">{t('menu_data')}</div>
              <MenuItem icon="🔒" label={t('sub_privacy')} onClick={() => go('/privacy')} />
              <MenuItem icon="📜" label={t('sub_terms')} onClick={() => go('/terms')} />
              <MenuItem icon="❓" label={t('sub_faq')} onClick={() => go('/faq')} />
              {signed && <MenuItem danger icon="🚪" label={t('sub_logout')} onClick={logout} />}
            </div>
          </div>
          </>
        )}

      {toast && <div className="topbar-toast">{toast}</div>}
    </nav>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button type="button" className={`dd-item ${danger ? 'danger' : ''}`} onClick={onClick}>
      <span className="dd-ico">{icon}</span>
      <span className="dd-label">{label}</span>
    </button>
  );
}