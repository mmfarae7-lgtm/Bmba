'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../lib/i18n';
import { COUNTRIES, DIAL_CODES } from '../lib/countries';

export default function RegisterForm({ onDone }) {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef(null);
  const [avatar, setAvatar] = useState('');
  const [method, setMethod] = useState('phone'); // 'phone' | 'email'
  const [name, setName] = useState('');
  const [phoneCode, setPhoneCode] = useState('+966');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [gender, setGender] = useState('');
  const [birth, setBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // التحقق برمز SMS/واتساب
  const [otpStep, setOtpStep] = useState(false);   // هل نعرض حقل إدخال الرمز
  const [otpCode, setOtpCode] = useState('');
  const [otpDev, setOtpDev] = useState('');        // الرمز التجريبي (بدون مزوّد إرسال)
  const [otpToken, setOtpToken] = useState('');    // توكن التحقق الصادر بعد نجاح الرمز
  const [otpSending, setOtpSending] = useState(false);
  const [otpErr, setOtpErr] = useState('');

  // تعبئة كود الدعوة مسبقاً من رابط المشاركة ?ref=<CODE>
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('invite') || params.get('invite_code');
      if (ref) setInvite(String(ref).trim());
      const m = params.get('method');
      if (m === 'email' || m === 'phone') setMethod(m);
    } catch {}
  }, []);

  const finish = () => {
    try { localStorage.setItem('bomba-onboarded', '1'); } catch {}
    try { document.cookie = 'bomba-onboarded=1; path=/; max-age=31536000; SameSite=Lax'; } catch {}
    if (onDone) { onDone(); return; }
    router.push('/');
    router.refresh();
  };

  const handleAvatar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t('reg_avatar_size'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  // إرسال رمز التحقق (SMS/واتساب) لرقم الجوال
  const sendOtp = async () => {
    setOtpErr('');
    const p = method === 'phone' ? phone.trim() : '';
    if (!p || p.length < 7) {
      setOtpErr(t('reg_phone_email_missing'));
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: p, phone_code: phoneCode, purpose: 'register' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpErr(data.error || 'تعذّر إرسال الرمز');
        setOtpSending(false);
        return;
      }
      setOtpDev(data.devCode || '');
      setOtpStep(true);
      setOtpCode('');
      setOtpSending(false);
      setLoading(false);
    } catch {
      setOtpErr('تعذّر إرسال الرمز');
      setOtpSending(false);
    }
  };

  // التحقق من الرمز واستخراج توكن صالح
  const confirmOtp = async () => {
    setOtpErr('');
    if (!otpCode.trim()) { setOtpErr(t('ld_pass_ph')); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), phone_code: phoneCode, code: otpCode.trim(), purpose: 'register' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpErr(data.error || 'الرمز غير صحيح');
        setLoading(false);
        return;
      }
      setOtpToken(data.token);
      setOtpStep(false);
      setOtpDev('');
      setLoading(false);
    } catch {
      setOtpErr('تعذّر التحقق من الرمز');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const hasPhone = method === 'phone' ? Boolean(phone.trim()) : false;
    const hasEmail = method === 'email' ? Boolean(email.trim()) : false;
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

    if (!name.trim() || !country || !gender || !birth) {
      setError(t('reg_missing'));
      return;
    }
    if (!hasPhone && !hasEmail) {
      setError(t('reg_phone_email_missing'));
      return;
    }
    if (method === 'email' && !validEmail) {
      setError(t('reg_email_invalid') || 'البريد الإلكتروني غير صحيح');
      return;
    }
    if (method === 'phone' && !otpToken) {
      setError(t('reg_otp_required'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reg_mismatch'));
      return;
    }

    setLoading(true);
    const payload = {
      name: name.trim(),
      phone: method === 'phone' ? phone.trim() : null,
      email: method === 'email' ? email.trim() : null,
      phone_code: method === 'phone' ? phoneCode : null,
      country,
      gender,
      birth_date: birth,
      avatar: avatar || null,
      password,
      invite_code: invite.trim() || null,
      otp_token: method === 'phone' ? otpToken : null,
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }
      finish();
    } catch {
      setError(t('reg_loading'));
      setLoading(false);
    }
  };

  return (
    <div className="reg-full">
      {error && <div className="error-msg">{error}</div>}

      {/* تبديل طريقة التسجيل: جوال / إيميل */}
      <div className="reg-method-tabs">
        <button
          type="button"
          className={`reg-method-tab ${method === 'phone' ? 'active' : ''}`}
          onClick={() => setMethod('phone')}
        >
          {t('reg_tab_phone')}
        </button>
        <button
          type="button"
          className={`reg-method-tab ${method === 'email' ? 'active' : ''}`}
          onClick={() => setMethod('email')}
        >
          {t('reg_tab_email')}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="avatar-upload">
          <div className={`avatar-preview ${avatar ? 'has-img' : ''}`}>
            {avatar ? (
              <img src={avatar} alt="avatar" />
            ) : (
              <span className="avatar-placeholder">📷</span>
            )}
          </div>
          <div className="avatar-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatar}
            />
            <button type="button" className="btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}>
              {t('reg_avatar_add')}
            </button>
            {avatar && (
              <button type="button" className="btn-ghost danger" onClick={() => setAvatar('')}>
                {t('reg_avatar_remove')}
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>{t('reg_invite')}</label>
          <input
            type="text"
            dir="ltr"
            style={{ textAlign: 'center', textTransform: 'uppercase' }}
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder={t('reg_invite_ph')}
          />
          <span className="rw-hint" style={{ marginTop: 4, display: 'block' }}>{t('reg_invite_note')}</span>
        </div>

        <div className="form-group">
          <label>{t('reg_username')} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="..."
            required
          />
        </div>

        {method === 'phone' ? (
          <div className="form-group">
            <label>{t('reg_phone')} *</label>
            <div className="phone-row">
              <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="phone-code">
                {DIAL_CODES.map(([code, label]) => (
                  <option key={code} value={code}>{code} {label}</option>
                ))}
              </select>
              <input
                type="tel"
                dir="ltr"
                style={{ textAlign: 'center' }}
                value={phone}
                disabled={Boolean(otpToken)}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5XXXXXXXX"
                required
              />
            </div>

            {!otpToken && (
              <div className="otp-actions">
                {otpStep ? (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      placeholder={t('reg_otp_code_ph')}
                      value={otpCode}
                      maxLength={6}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="otp-input"
                      style={{ textAlign: 'center', letterSpacing: 6 }}
                    />
                    <button type="button" className="btn-ghost" onClick={confirmOtp} disabled={loading}>
                      {loading ? t('reg_loading') : t('reg_otp_verify')}
                    </button>
                    <button type="button" className="otp-resend" onClick={sendOtp} disabled={otpSending}>
                      {t('reg_otp_resend')}
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-ghost" onClick={sendOtp} disabled={otpSending}>
                    {otpSending ? t('reg_loading') : t('reg_otp_send')}
                  </button>
                )}
                {otpDev && (
                  <span className="otp-dev">{t('reg_otp_dev')} <b>{otpDev}</b></span>
                )}
                {otpErr && <span className="error-msg" style={{ marginTop: 6 }}>{otpErr}</span>}
              </div>
            )}

            {otpToken && (
              <div className="otp-ok">
                ✅ {t('reg_otp_verified')}
              </div>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label>{t('reg_email')} *</label>
            <input
              type="email"
              dir="ltr"
              style={{ textAlign: 'center' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('reg_email_ph')}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>{t('reg_country')} *</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} required>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t('reg_gender')} *</label>
          <div className="gender-row">
            <button
              type="button"
              className={`gender-btn ${gender === 'male' ? 'active' : ''}`}
              onClick={() => setGender('male')}
            >
              👨 {t('reg_male')}
            </button>
            <button
              type="button"
              className={`gender-btn ${gender === 'female' ? 'active' : ''}`}
              onClick={() => setGender('female')}
            >
              👩 {t('reg_female')}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>{t('reg_birth')} *</label>
          <input
            type="date"
            dir="ltr"
            style={{ textAlign: 'center' }}
            value={birth}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setBirth(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>{t('reg_pass')} *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="4 chars min"
            required
            minLength="4"
          />
        </div>

        <div className="form-group">
          <label>{t('reg_confirm')} *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="..."
            required
            minLength="4"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t('reg_loading') : t('reg_btn')}
        </button>
      </form>
    </div>
  );
}