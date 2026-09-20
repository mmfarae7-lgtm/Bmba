'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';
import { useI18n } from '../../../lib/i18n';

const META = {
  arena: { icon: '🎯', built: true },
  quiz: { icon: '❓', built: false },
  champions: { icon: '👑', built: false },
  coach: { icon: '🧢', built: false },
  store: { icon: '🛒', built: false },
};

const SECTION_KEYS = {
  quiz: { title_key: 'chal_hub_quiz', desc_key: 'chal_hub_quiz_d' },
  champions: { title_key: 'chal_hub_champions', desc_key: 'chal_hub_champions_d' },
  coach: { title_key: 'chal_hub_coach', desc_key: 'chal_hub_coach_d' },
  store: { title_key: 'chal_hub_store', desc_key: 'chal_hub_store_d' },
  arena: { title_key: 'chal_hub_arena', desc_key: 'chal_hub_arena_d' },
};

export default function SectionPage() {
  const { t } = useI18n();
  const { section } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  const meta = META[section];
  if (!meta) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <div className="page-header">
            <h1>404</h1>
            <Link href="/challenges">← {t('chal_hub_greet')}</Link>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  const keys = SECTION_KEYS[section];

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>{meta.icon} {t(keys.title_key)}</h1>
          <p>{t(keys.desc_key)}</p>
        </div>

        {meta.built ? (
          <div className="chal-hint">{t('chal_hub_greet')}</div>
        ) : (
          <div className="chal-hint">{t('chal_hub_greet')} — {t('chal_hub_greet')}</div>
        )}

        <Link href="/challenges" className="hub-go">
          ← {t('chal_hub_greet')}
        </Link>
      </div>
      <BottomNav />
    </>
  );
}
