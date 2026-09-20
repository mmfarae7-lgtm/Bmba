'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../lib/i18n';
import { DIAL_CODES } from '../lib/countries';

export default function LoginMethods({ onDone, withRegisterLink = true, onNeedAccount }) {
  const { t } = useI18n();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  // وضع الدخول برمز الجوال (SMS/واتساب)
  const [otpMode, setOtpMode] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpDial, setOtpDial] = useState('+966');
  const [otpCode, setOtpCode] = useState('');
  const [otpDev, setOtpDev] = useState('');
  const [otpWaitCode, setOtpWaitCode] = useState(false); // هل أُرسل الرمز وننتظر إدخاله
  const [otpToken, setOtpToken] = useState('');

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const e = p.get('error');
      if (e === 'google') setError('تعذّر تسجيل الدخول عبر جوجل، حاول مجدداً');
      else if (e === 'facebook') setError('تعذّر تسجيل الدخول عبر فيسبوك، حاول مجدداً');
      else if (e === 'blocked') setError('هذا الحساب محظور');
      else if (e === 'oauth') setError('تعذّر تسجيل الدخول عبر حسابك، حاول مجدداً');
    } catch {}
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const finish = (user) => {
    try { localStorage.setItem('bomba-onboarded', '1'); } catch {}
    try { document.cookie = 'bomba-onboarded=1; path=/; max-age=31536000; SameSite=Lax'; } catch {}
    if (onDone) { onDone(user); return; }
    router.push('/');
    router.refresh();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('onb_login_btn')); setLoading(false); return; }
      finish(data.user);
    } catch {
      setError(t('onb_login_btn'));
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setError('');
    const p = otpPhone.trim();
    if (!p || p.replace(/\D/g, '').length < 7) {
      setError(t('ld_label'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: p, phone_code: otpDial, purpose: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('ld_enter')); setLoading(false); return; }
      setOtpDev(data.devCode || '');
      setOtpWaitCode(true);
      setOtpCode('');
      setLoading(false);
    } catch {
      setError(t('ld_enter'));
      setLoading(false);
    }
  };

  const enterWithOtp = async () => {
    setError('');
    if (!otpCode.trim()) { setError(t('ld_otp_required')); return; }
    if (!otpToken) {
      // التحقق من الرمز أولاً للحصول على توكن صالح
      setLoading(true);
      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: otpPhone.trim(), phone_code: otpDial, code: otpCode.trim(), purpose: 'login' }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('ld_otp_required')); setLoading(false); return; }
        setOtpToken(data.token);
        setLoading(false);
      } catch {
        setError(t('ld_otp_required'));
        setLoading(false);
        return;
      }
    }
    // الدخول باستخدام التوكن
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_token: otpToken, phone: otpPhone.trim(), phone_code: otpDial }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('ld_enter')); setLoading(false); return; }
      finish(data.user);
    } catch {
      setError(t('ld_enter'));
      setLoading(false);
    }
  };

  const enterGuest = async () => {
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/guest', { method: 'POST' });
      finish({ guest: true });
    } catch {
      setError(t('onb_login_btn'));
      setLoading(false);
    }
  };

  const socialLogin = async (provider) => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${provider}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // غير مفعّل بعد → نعرض "قريباً"
      setLoading(false);
      showToast(t('ld_soon'));
    } catch {
      setLoading(false);
      showToast(t('ld_soon'));
    }
  };

  // زر «التسجيل برقم التلفون»: يفتح نموذج التسجيل على تبويب الجوال
  const goPhoneRegister = () => {
    if (onNeedAccount) { onNeedAccount(); return; }
    router.push('/register?method=phone');
  };

  return (
    <div className="ad-card">
      {toast && <div className="topbar-toast">{toast}</div>}

      <ArhaboLogo />

      <p className="ad-sub">{t('ld_sub')}</p>

      {!otpMode ? (
        <form className="ad-form" onSubmit={handleLogin}>
          <div className="ad-field">
            <label>{t('ld_label')}</label>
            <input
              type="text"
              dir="ltr"
              style={{ textAlign: 'center' }}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t('ld_ph')}
              required
              autoComplete="username"
            />
          </div>
          <div className="ad-field">
            <label>{t('ld_pass')}</label>
            <input
              type="password"
              style={{ textAlign: 'center' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('ld_pass_ph')}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="ad-submit" disabled={loading}>
            {loading ? t('ld_loading') : t('ld_enter')}
          </button>
        </form>
      ) : (
        <form className="ad-form" onSubmit={(e) => { e.preventDefault(); enterWithOtp(); }}>
          <div className="ad-field">
            <label>{t('ld_phone')}</label>
            <div className="phone-row">
              <select value={otpDial} onChange={(e) => setOtpDial(e.target.value)} className="phone-code">
                {DIAL_CODES.map(([code, label]) => (
                  <option key={code} value={code}>{code} {label}</option>
                ))}
              </select>
              <input
                type="tel"
                dir="ltr"
                style={{ textAlign: 'center' }}
                value={otpPhone}
                disabled={otpWaitCode}
                onChange={(e) => setOtpPhone(e.target.value)}
                placeholder="5XXXXXXXX"
                required
                autoComplete="tel-national"
              />
            </div>
          </div>
          {otpWaitCode && (
            <div className="ad-field">
              <label>{t('reg_otp_code_ph')}</label>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                style={{ textAlign: 'center', letterSpacing: 6 }}
                value={otpCode}
                maxLength={6}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={t('reg_otp_code_ph')}
                required
              />
            </div>
          )}
          {otpDev && (
            <div className="otp-dev" style={{ marginBottom: 8 }}>{t('ld_otp_dev')} <b>{otpDev}</b></div>
          )}
          {error && <div className="error-msg">{error}</div>}
          {!otpWaitCode ? (
            <button type="button" className="btn-ghost" style={{ width: '100%' }} onClick={sendOtp} disabled={loading}>
              {loading ? t('ld_loading') : t('ld_otp_send')}
            </button>
          ) : (
            <button type="submit" className="ad-submit" disabled={loading}>
              {loading ? t('ld_loading') : t('ld_otp_enter')}
            </button>
          )}
        </form>
      )}

      <button type="button" className="link-btn ad-link" style={{ marginTop: 10 }}
        onClick={() => { setOtpMode(!otpMode); setError(''); setOtpWaitCode(false); setOtpToken(''); setOtpDev(''); setOtpCode(''); }}>
        {otpMode ? t('ld_otp_back') : t('ld_otp_toggle')}
      </button>

      <div className="ad-or"><span>{t('ld_or')}</span></div>

      <AdButton tone="google" icon={<GoogleIcon />} label={t('ld_google')}
        onClick={() => socialLogin('google')} disabled={loading} />

      <AdButton tone="facebook" icon={<FacebookIcon />} label={t('ld_facebook')}
        onClick={() => socialLogin('facebook')} disabled={loading} />

      <AdButton tone="phone" icon={<span className="ion">📱</span>} label={t('ld_phone')}
        onClick={goPhoneRegister} disabled={loading} />

      <AdButton tone="guest" icon={<span className="ion">👤</span>} label={t('ld_guest')}
        note={t('ld_guest_note')} onClick={enterGuest} disabled={loading} />

      {withRegisterLink && (
        <p className="ad-switch">
          {t('ld_no_account')}{' '}
          {onNeedAccount ? (
            <button type="button" className="link-btn ad-link" onClick={onNeedAccount}>{t('ld_signup')}</button>
          ) : (
            <a href="/register" className="ad-link">{t('ld_signup')}</a>
          )}
        </p>
      )}
    </div>
  );
}

function AdButton({ tone, icon, label, note, onClick, disabled }) {
  return (
    <button type="button" className={`ad-btn ad-${tone}`} onClick={onClick} disabled={disabled}>
      <span className="ad-ico">{icon}</span>
      <span className="ad-lbl">
        <span className="ad-lbl-text">{label}</span>
        {note && <span className="ad-note">{note}</span>}
      </span>
    </button>
  );
}

function ArhaboLogo() {
  return (
    <div className="arhabo">
      <img src="/logo.png" alt="بمبا" className="arhabo-bomba" />
      <div className="arhabo-word">أرحبو</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 40.6 44 35.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"/>
    </svg>
  );
}