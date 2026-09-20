'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../lib/i18n';
import LoginMethods from '../../components/LoginMethods';
import RegisterForm from '../../components/RegisterForm';

export default function Onboarding() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState(lang);

  const chooseLang = (l) => {
    setChosen(l);
    setLang(l);
  };

  const finish = () => {
    try { localStorage.setItem('bomba-onboarded', '1'); } catch {}
    try { document.cookie = 'bomba-onboarded=1; path=/; max-age=31536000; SameSite=Lax'; } catch {}
    router.push('/');
    router.refresh();
  };

  return (
    <div className="onb-wrap">
      <div className={`onb-card ${step === 1 ? 'onb-card-white' : ''}`}>
        <div className="onb-steps">
          <span className="onb-step-num">{t('onb_step')} {step + 1} {t('onb_of')} 3</span>
          <div className="onb-dots">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`onb-dot ${step >= i ? 'active' : ''}`}></span>
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="onb-step onb-lang-step">
            <div className="onb-hero"><img src="/logo.png" alt="BMBA" className="onb-hero-logo" /></div>
            <h1 className="onb-title">{t('onb_title')}</h1>
            <p className="onb-subtitle">{t('onb_subtitle')}</p>
            <div className="onb-en-sub">{t('onb_choose_default')}</div>

            <div className="lang-cards">
              <button
                type="button"
                className={`lang-card ${chosen === 'ar' ? 'selected' : ''}`}
                onClick={() => chooseLang('ar')}
              >
                <span className="lang-flag">🇸🇦</span>
                <span className="lang-name">العربية</span>
                <span className="lang-check">{chosen === 'ar' ? '✓' : ''}</span>
              </button>
              <button
                type="button"
                className={`lang-card ${chosen === 'en' ? 'selected' : ''}`}
                onClick={() => chooseLang('en')}
              >
                <span className="lang-flag">🇬🇧</span>
                <span className="lang-name">English</span>
                <span className="lang-check">{chosen === 'en' ? '✓' : ''}</span>
              </button>
            </div>

            <div className="onb-welcome">
              {chosen === 'ar' ? t('onb_welcome_ar') : t('onb_welcome_en')}
            </div>

            <button type="button" className="btn-primary onb-continue" onClick={() => setStep(1)}>
              {t('onb_continue')} ←
            </button>
          </div>
        )}

        {step === 1 && (
          <div className={`onb-step onb-login-step`}>
            <LoginMethods onDone={finish} onNeedAccount={() => setStep(2)} />

            <button type="button" className="onb-back" onClick={() => setStep(0)}>
              → {t('onb_back')}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step onb-register-step">
            <div className="onb-hero"><img src="/logo.png" alt="BMBA" className="onb-hero-logo" /></div>
            <h1 className="onb-title">{t('onb_register_title')}</h1>
            <p className="onb-subtitle">{t('onb_register_subtitle')}</p>
            <p className="prize-note">{t('reg_prize_note')}</p>

            <RegisterForm onDone={finish} />

            <div className="onb-switch">
              {t('onb_already_account')}{' '}
              <button type="button" className="link-btn" onClick={() => setStep(1)}>{t('onb_login_btn')}</button>
            </div>

            <button type="button" className="onb-back" onClick={() => setStep(1)}>
              → {t('onb_back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}