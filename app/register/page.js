'use client';
import Link from 'next/link';
import ThemeToggle from '../../components/ThemeToggle';
import RegisterForm from '../../components/RegisterForm';
import { useI18n } from '../../lib/i18n';

export default function Register() {
  const { t } = useI18n();
  return (
    <>
      <Header />
      <div className="main-container">
        <div className="auth-container">
          <div className="auth-box">
            <h1>⚽ {t('reg_title')}</h1>
            <p className="subtitle">{t('reg_subtitle')}</p>
            <p className="prize-note">{t('reg_prize_note')}</p>

            <RegisterForm />

            <div className="auth-switch">
              {t('reg_has_account')} <Link href="/login">{t('reg_login')}</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Header() {
  const { t } = useI18n();
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <img src="/logo.png" alt="BMBA" className="navbar-logo" />
          {t('brand')}
        </Link>
        <div className="navbar-user">
          <ThemeToggle />
          <Link href="/login" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t('nav_login')}</Link>
        </div>
      </div>
    </nav>
  );
}