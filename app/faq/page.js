'use client';
import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

export default function Faq() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  const items = [1, 2, 3];

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>{t('doc_faq_title')}</h1>
        </div>
        <div className="doc-block">
          {items.map((n) => (
            <div className={`faq-item ${open === n ? 'open' : ''}`} key={n}>
              <button type="button" className="faq-q" onClick={() => setOpen(open === n ? 0 : n)}>
                <span>{t(`doc_faq_${n}q`)}</span>
                <span className="faq-caret">{open === n ? '▾' : '▸'}</span>
              </button>
              {open === n && <div className="faq-a">{t(`doc_faq_${n}a`)}</div>}
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </>
  );
}