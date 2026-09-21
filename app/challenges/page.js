'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

export default function ChallengesHub() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  const signed = user && !user.guest;

  const sections = [
    { href: '/challenges/arena', icon: '🎯', title: t('chal_hub_arena'), desc: t('chal_hub_arena_d'), cls: 'arena' },
    { href: '/challenges/quiz', icon: '❓', title: t('chal_hub_quiz'), desc: t('chal_hub_quiz_d'), cls: 'quiz' },
    { href: '/challenges/champions', icon: '👑', title: t('chal_hub_champions'), desc: t('chal_hub_champions_d'), cls: 'champions' },
    { href: '/challenges/coach', icon: '🧢', title: t('chal_hub_coach'), desc: t('chal_hub_coach_d'), cls: 'coach' },
    { href: '/store', icon: '🛍️', title: t('chal_hub_store'), desc: t('chal_hub_store_d'), cls: 'store' },
  ];

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>{t('chal_title')}</h1>
          <p>{t('chal_hub_greet')}</p>
        </div>

        <div className="hub-grid">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className={`hub-tile ${s.cls}`}>
              <span className="hub-ico">{s.icon}</span>
              <span className="hub-name">{s.title}</span>
              <span className="hub-desc">{s.desc}</span>
              <span className="hub-go">←</span>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
