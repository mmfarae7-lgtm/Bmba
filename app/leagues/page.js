'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';
import { tournamentsByCategory } from '../../lib/tournaments';

export default function Leagues() {
  const { t, lang } = useI18n();
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
    fetch('/api/tournaments')
      .then((r) => r.json())
      .then((d) => {
        const map = {};
        (d.tournaments || []).forEach((x) => { map[x.slug] = x; });
        setMeta(map);
      })
      .catch(() => {});
  }, []);

  const cats = tournamentsByCategory();
  const name = (tr) => (lang === 'ar' ? tr.ar : tr.en);

  return (
    <>
      <TopBar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1><span className="grad">{t('lg_full_title')}</span></h1>
          <p>{t('lg_full_sub')}</p>
        </div>

        {cats.map((cat) => (
          <section className="lg-section" key={cat.id}>
            <h2 className="lg-cat">{lang === 'ar' ? cat.ar : cat.en}</h2>
            <div className="lg-grid">
              {cat.tournaments.map((tr) => {
                const m = meta ? meta[tr.slug] : null;
                return (
                  <Link key={tr.slug} href={`/leagues/${tr.slug}`} className="lg-card">
                    <span className="lg-emoji">{tr.emoji}</span>
                    <span className="lg-name">{name(tr)}</span>
                    {m && m.found && (
                      <span className="lg-badge">
                        {m.matches} {t('lg_matches')}
                        {m.finished > 0 && <> • {m.finished} {t('lg_finished')}</>}
                      </span>
                    )}
                    <span className="lg-view">← {t('lg_view')}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <BottomNav />
    </>
  );
}