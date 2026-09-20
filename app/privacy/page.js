'use client';
import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

export default function Privacy() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>{t('doc_privacy_title')}</h1>
        </div>
        <div className="doc-block">
          <p>{t('doc_privacy_p1')}</p>
          <p>{t('doc_privacy_p2')}</p>
          <p>{t('doc_privacy_p3')}</p>
        </div>
      </div>
      <BottomNav />
    </>
  );
}