'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { teamNameAr } from '../../lib/team-names-ar';
import { useI18n } from '../../lib/i18n';

export default function Profile() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [ranks, setRanks] = useState({ weekly: null, monthly: null, seasonal: null });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchPredictions() {
    const res = await fetch('/api/predictions');
    const data = await res.json();
    setPredictions(data.predictions || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user);
      if (!d.user || d.user.guest) router.push('/login');
      else fetchPredictions();
    });
  }, []);

  useEffect(() => {
    if (!user || user.guest) return;
    const periods = [['weekly', 'weekly'], ['monthly', 'monthly'], ['seasonal', 'all']];
    Promise.all(periods.map(([, p]) =>
      fetch(`/api/leaderboard?period=${p}`).then(r => r.json()).catch(() => ({ leaderboard: [] }))
    )).then(results => {
      const next = {};
      periods.forEach(([key], i) => {
        const list = results[i].leaderboard || [];
        const idx = list.findIndex(u => u.id === user.id);
        next[key] = idx >= 0 ? idx + 1 : null;
      });
      setRanks(next);
    });
  }, [user]);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="main-container">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  const totalEarned = predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const finished = predictions.filter(p => p.status === 'finished');
  const correct = finished.filter(p => p.points_earned > 0).length;
  const wrong = finished.filter(p => p.points_earned === 0).length;

  return (
    <>
      <Navbar user={user} />
      <div className="main-container">
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 30}}>
          <div className="admin-card" style={{textAlign: 'center', padding: '30px'}}>
            <div style={{width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 900, margin: '0 auto 15px', border: '2px solid var(--accent)', color: '#fff'}}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <h2 style={{fontSize: '1.4rem', marginBottom: 4}}>{user.name}</h2>
            {user.phone_code && (
              <p style={{color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.9rem'}} dir="ltr">
                {user.phone_code} {user.phone}
              </p>
            )}
            {!user.phone_code && (
              <p style={{color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.9rem'}} dir="ltr">
                {user.phone}
              </p>
            )}
            {user.country && (
              <p style={{color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.9rem'}}>
                🌍 {t('prof_country')}: {user.country}
              </p>
            )}
            {user.gender && (
              <p style={{color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.9rem'}}>
                {user.gender === 'male' ? '👨' : '👩'} {t('prof_gender')}: {t(user.gender === 'male' ? 'reg_male' : 'reg_female')}
              </p>
            )}
            {user.birth_date && (
              <p style={{color: 'var(--text-muted)', marginBottom: 15, fontSize: '0.9rem'}}>
                🎂 {t('prof_birth')}: <span dir="ltr">{user.birth_date}</span>
              </p>
            )}
            {!user.birth_date && <div style={{height: 15}}></div>}
            {user.role !== 'user' && (
              <span className={`badge ${user.role === 'superadmin' ? 'badge-superadmin' : 'badge-admin'}`}>
                {user.role === 'superadmin' ? t('prof_admin') : t('prof_mod')}
              </span>
            )}
            <div style={{display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20, flexWrap: 'wrap'}}>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 900, color: 'var(--gold)'}}>{user.points}</div>
                <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{t('prof_points')}</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5}}>
                  <img src="/coin.png" alt="" style={{width: 22, height: 22, objectFit: 'contain'}} />
                  {user.bombs || 0}
                </div>
                <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{t('topb_bombs')}</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)'}}>{correct}</div>
                <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{t('prof_correct')}</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)'}}>{wrong}</div>
                <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{t('prof_wrong')}</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 900}}>{predictions.length}</div>
                <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{t('prof_total')}</div>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h3>{t('prof_history')}</h3>
            <div style={{maxHeight: 400, overflowY: 'auto'}}>
              {predictions.length === 0 ? (
                <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0'}}>
                  {t('prof_no_preds')}
                  <br />
                  <Link href="/" style={{color: 'var(--accent)'}}>{t('prof_go_predict')}</Link>
                </p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('prof_match')}</th>
                      <th>{t('prof_your_pick')}</th>
                      <th>{t('prof_result')}</th>
                      <th>{t('prof_pts')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map(p => (
                      <tr key={p.id}>
                        <td style={{fontWeight: 600, color: 'var(--text-muted)'}}>
                          {teamNameAr(p.home_team)} vs {teamNameAr(p.away_team)}
                        </td>
                        <td>{p.home_score} - {p.away_score}</td>
                        <td>
                          {p.status === 'finished' 
                            ? `${p.actual_home} - ${p.actual_away}`
                            : p.status === 'live' ? t('prof_live') : '—'}
                        </td>
                        <td style={{color: p.points_earned > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 800}}>
                          {p.status === 'finished' ? `+${p.points_earned}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{marginBottom: 30}}>
          <h3>🏆 {t('prof_ranks')}</h3>
          <div className="rank-grid">
            <RankBox label={t('prof_rank_weekly')} value={ranks.weekly} />
            <RankBox label={t('prof_rank_monthly')} value={ranks.monthly} />
            <RankBox label={t('prof_rank_seasonal')} value={ranks.seasonal} />
          </div>
        </div>

        <div className="admin-card" style={{marginBottom: 30}}>
          <h3>{t('prof_settings')}</h3>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 10}}>
            <span style={{fontWeight: 600}}>{t('prof_lang')}</span>
            <LangToggle />
          </div>
        </div>

        <div style={{textAlign: 'center'}}>
          {user.role !== 'user' && (
            <Link href="/admin" className="btn-sm" style={{background: 'var(--accent)', color: 'white', padding: '10px 30px', display: 'inline-block'}}>
              {t('prof_dashboard')}
            </Link>
          )}
          <button 
            className="btn-sm" 
            style={{background: 'var(--danger)', color: 'white', padding: '10px 30px', marginRight: 10}}
            onClick={logout}
          >
            {t('prof_logout')}
          </button>
        </div>
      </div>

      <MobileNav user={user} />
    </>
  );
}

function RankBox({ label, value }) {
  const { t } = useI18n();
  return (
    <div className="rank-box">
      <div className="rank-medal">{value === 1 ? '🥇' : value === 2 ? '🥈' : value === 3 ? '🥉' : '🏅'}</div>
      <div className="rank-value" dir="ltr">{value ? `#${value}` : '—'}</div>
      <div className="rank-label">{label}</div>
    </div>
  );
}

function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-toggle">
      <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>{t('prof_ar')}</button>
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>{t('prof_en')}</button>
    </div>
  );
}

function Navbar({ user }) {
  return <TopBar user={user} />;
}

function MobileNav({ user }) {
  return <BottomNav />;
}