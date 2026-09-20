'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';
import { useI18n } from '../../../lib/i18n';
import { teamNameAr } from '../../../lib/team-names-ar';

export default function TournamentDetail() {
  const { t, lang } = useI18n();
  const params = useParams();
  const slug = params.slug;
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('standings');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
    fetch(`/api/tournaments/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError(t('lg_nodata')));
  }, [slug]);

  if (error) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container">
          <Link href="/leagues" className="back-link">← {t('lg_back_all')}</Link>
          <div className="empty-state"><div className="icon">📭</div><p>{error}</p></div>
        </div>
        <BottomNav />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container"><div className="loading"><div className="spinner"></div></div></div>
        <BottomNav />
      </>
    );
  }

  const tr = data.tournament;
  const title = lang === 'ar' ? tr.ar : tr.en;
  const league = data.league;
  const stats = data.stats;

  const tabs = [
    { key: 'standings', icon: '🏆', label: t('lg_tabs_standings') },
    { key: 'scorers', icon: '⚽', label: t('lg_tabs_scorers') },
    { key: 'matches', icon: '📅', label: t('lg_tabs_matches') },
    { key: 'squad', icon: '👥', label: t('lg_tabs_squad') },
  ];

  return (
    <>
      <TopBar user={user} />
      <div className="main-container md-container">
        <Link href="/leagues" className="back-link">← {t('lg_back_all')}</Link>

        <div className="md-card">
          <div className="md-league">
            {league && league.logo ? (
              <img className="league-logo lg-img" src={league.logo} alt="" />
            ) : (
              <span className="league-logo">{tr.emoji}</span>
            )}
            <div className="lg-head-txt">
              <span className="md-league-name">{title}</span>
              {league && (league.country || league.name !== title) && (
                <span className="league-country">{league.country || league.name}</span>
              )}
            </div>
          </div>

          <div className="lg-stats">
            <StatChip icon="📅" val={stats.total} label={t('lg_stats_matches')} />
            <StatChip icon="✅" val={stats.finished} label={t('lg_stats_finished')} />
            {stats.live > 0 && <StatChip icon="🔴" val={stats.live} label={t('lg_stats_live')} />}
            <StatChip icon="⏳" val={stats.upcoming} label={t('lg_stats_upcoming')} />
            <StatChip icon="⚽" val={stats.totalGoals} label={t('lg_stats_goals')} />
            {stats.avgGoals > 0 && <StatChip icon="📊" val={stats.avgGoals} label={t('lg_stats_avg')} />}
          </div>
        </div>

        <div className="md-tabs">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              className={`md-tab ${tab === tb.key ? 'active' : ''}`}
              onClick={() => setTab(tb.key)}
            >
              <span className="md-tab-icon">{tb.icon}</span>
              <span className="md-tab-label">{tb.label}</span>
            </button>
          ))}
        </div>

        <div className="md-body">
          {tab === 'standings' && <Standings data={data} t={t} />}
          {tab === 'scorers' && <Scorers data={data} t={t} />}
          {tab === 'matches' && <Matches data={data} t={t} />}
          {tab === 'squad' && (
            <div className="md-empty big">
              <div className="icon">👥</div>
              <p>{t('lg_squad_soon')}</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
}

function StatChip({ icon, val, label }) {
  return (
    <div className="lg-stat">
      <span className="lg-stat-val" dir="ltr">{icon} {val}</span>
      <span className="lg-stat-lbl">{label}</span>
    </div>
  );
}

function Standings({ data, t }) {
  const standings = data.standings;
  if (!standings.length) {
    return (
      <div className="md-empty big">
        <div className="icon">🏆</div>
        <p>{t('lg_no_standings')}</p>
      </div>
    );
  }
  return (
    <div className="std-wrap">
      <table className="admin-table std-table lg-std-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('lg_t_head')}</th>
            <th>{t('lg_t_played')}</th>
            <th>{t('lg_t_won')}</th>
            <th>{t('lg_t_drawn')}</th>
            <th>{t('lg_t_lost')}</th>
            <th>{t('lg_t_gf')}</th>
            <th>{t('lg_t_ga')}</th>
            <th>{t('lg_t_gd')}</th>
            <th>{t('lg_t_pts')}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r) => (
            <tr key={r.name}>
              <td className="std-pos">{r.pos}</td>
              <td className="std-team">
                <TeamLogo src={r.logo} size={22} />
                <span>{teamNameAr(r.name)}</span>
              </td>
              <td>{r.played}</td>
              <td>{r.win}</td>
              <td>{r.draw}</td>
              <td>{r.loss}</td>
              <td>{r.gf}</td>
              <td>{r.ga}</td>
              <td className={r.gd > 0 ? 'lg-gd-pos' : (r.gd < 0 ? 'lg-gd-neg' : '')}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="std-pts">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="std-title">{t('lg_t_form')}</div>
      {standings.map((r) => (
        <div className="lg-form-row" key={r.name}>
          <span className="lg-form-name">{teamNameAr(r.name)}</span>
          <div className="form-marks">
            {r.form.length ? r.form.map((f, i) => (
              <span key={i} className={`form-mark fm-${f}`}>{f}</span>
            )) : <span className="md-empty small">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Scorers({ data, t }) {
  const scorers = data.scorers;
  return (
    <>
      <div className="std-wrap">
        <div className="std-title">⚽ {t('lg_scorers_title')}</div>
        {scorers.length ? (
          <div className="lg-scorers">
            {scorers.map((s) => (
              <div className="lg-scorer" key={s.name}>
                <span className="lg-scorer-pos">{s.pos}</span>
                <TeamLogo src={s.logo} size={26} />
                <span className="lg-scorer-name">{teamNameAr(s.name)}</span>
                <span className="lg-scorer-goals" dir="ltr">{s.goals} ⚽</span>
                <span className="lg-scorer-mp">{s.played} {t('lg_scorers_played')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="md-empty">{t('lg_no_scorers')}</div>
        )}
      </div>
      <p className="lg-note">ℹ️ {t('lg_scorers_soon')}</p>
    </>
  );
}

function Matches({ data, t }) {
  const matches = data.matches;
  if (!matches.length) return <div className="md-empty big"><div className="icon">📅</div><p>{t('lg_no_matches')}</p></div>;
  return (
    <div className="lg-matches">
      {matches.map((m) => (
        <Link href={`/match/${m.id}`} key={m.id} className="lg-match">
          <div className="lg-match-date" dir="ltr">
            {m.match_date}
            {m.match_time ? ` • ${m.match_time}` : ''}
          </div>
          <div className="match-row">
            <div className="mteam home">
              <TeamLogo src={m.home_logo} size={26} />
              <span className="t-name">{teamNameAr(m.home_team)}</span>
            </div>
            <div className="mcenter">
              {m.status === 'live' && (
                <div className="score live-score"><span className="live-dot"></span>{m.home_score} - {m.away_score}</div>
              )}
              {m.status === 'finished' && (
                <div className="score fin-score">{m.home_score} - {m.away_score}</div>
              )}
              {m.status === 'upcoming' && (
                <>
                  <div className="score" style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>VS</div>
                  <span className="ktime">{m.match_time || t('lg_vs')}</span>
                </>
              )}
            </div>
            <div className="mteam away">
              <span className="t-name">{teamNameAr(m.away_team)}</span>
              <TeamLogo src={m.away_logo} size={26} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TeamLogo({ src, size }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img className="team-logo" src={src} alt="" style={{ width: size, height: size, objectFit: 'contain' }} onError={() => setErr(true)} />;
  }
  return <span className="mini-logo" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>⚽</span>;
}