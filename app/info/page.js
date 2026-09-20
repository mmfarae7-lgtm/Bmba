'use client';
import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

export default function Info() {
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
          <h1>ℹ️ <span className="grad">{t('info_title')}</span></h1>
        </div>

        <InfoBlock title={t('info_how_title')} items={[t('info_how_1'), t('info_how_2'), t('info_how_3'), t('info_how_4')]} />
        <InfoBlock title={t('info_pts_title')} items={[t('info_pts_1'), t('info_pts_2'), t('info_pts_3'), t('info_pts_4')]} />
        <InfoBlock title={t('info_bombs_title')} items={[t('info_bombs_1'), t('info_bombs_2')]} />
        <InfoBlock title={t('info_winners_title')} items={[t('info_winners_1')]} />
      </div>
      <BottomNav />
    </>
  );
}

function InfoBlock({ title, items }) {
  return (
    <div className="info-block">
      <h3>{title}</h3>
      {items.map((it, i) => (
        <p key={i}>{it}</p>
      ))}
    </div>
  );
}