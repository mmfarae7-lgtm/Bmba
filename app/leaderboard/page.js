'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '../../components/ThemeToggle';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

export default function Leaderboard() {
  const { t } = useI18n();
  const [period, setPeriod] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchLeaderboard() {
    const res = await fetch(`/api/leaderboard?period=${period}`);
    const json = await res.json();
    setData(json.leaderboard || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const tabs = [
    { key: 'all', label: t('lb_all') },
    { key: 'daily', label: t('lb_daily') },
    { key: 'weekly', label: t('lb_weekly') },
    { key: 'monthly', label: t('lb_monthly') },
  ];

  return (
    <>
      <Navbar />
      <div className="main-container">
        <div className="page-header">
          <h1>{t('lb_title')}</h1>
          <p>{t('lb_subtitle')}</p>
        </div>

        <div className="period-tabs">
          {tabs.map(tab => (
            <button key={tab.key} className={period === tab.key ? 'active' : ''} onClick={() => setPeriod(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏆</div>
            <p>{t('lb_no_data')}</p>
          </div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('lb_player')}</th>
                <th>{t('lb_points')}</th>
                <th>{t('lb_correct')}</th>
                <th>{t('lb_total')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u, i) => (
                <tr key={u.id}>
                  <td>
                    <span className={`rank-badge rank-${i < 3 ? i + 1 : 'other'}`}>{i + 1}</span>
                  </td>
                  <td style={{fontWeight: 700}}>
                    {u.name}
                    {u.role !== 'user' && (
                      <span className={`badge ${u.role === 'superadmin' ? 'badge-superadmin' : 'badge-admin'}`} style={{marginRight: 8}}>
                        {u.role === 'superadmin' ? t('lb_superadmin') : t('lb_admin')}
                      </span>
                    )}
                  </td>
                  <td style={{color: 'var(--gold)', fontWeight: 900, fontSize: '1.1rem'}}>⭐ {u.points}</td>
                  <td style={{color: 'var(--success)'}}>{u.correct_predictions || 0}</td>
                  <td>{u.total_predictions || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BottomNav />
    </>
  );
}

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user));
  }, []);

  return <TopBar user={user} />;
}