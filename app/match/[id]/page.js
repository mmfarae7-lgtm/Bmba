'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import TopBar from '../../../components/TopBar';
import BottomNav from '../../../components/BottomNav';
import PredictModal from '../../../components/PredictModal';
import { isMatchOpen } from '../../../lib/client-match-time';
import { teamNameAr } from '../../../lib/team-names-ar';
import { useI18n } from '../../../lib/i18n';

export default function MatchDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('rank');
  const [prediction, setPrediction] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial = searchParams.get('tab');
    if (initial) setTab(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user));
  }, []);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/match/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [params.id]);

  useEffect(() => {
    if (user && !user.guest && params.id) {
      fetch(`/api/predictions?match_id=${params.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.prediction) {
            setPrediction({ home: d.prediction.home_score, away: d.prediction.away_score, points_earned: d.prediction.points_earned || 0 });
          }
        });
    }
  }, [user, params.id]);

  if (loading) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container"><div className="loading"><div className="spinner"></div></div></div>
        <BottomNav />
      </>
    );
  }

  if (!data || !data.match) {
    return (
      <>
        <TopBar user={user} />
        <div className="main-container"><div className="empty-state"><div className="icon">📭</div><p>{t('md_notfound')}</p></div></div>
        <BottomNav />
      </>
    );
  }

  const m = data.match;
  const stats = data.stats || {};
  const signed = user && !user.guest;

  const savePrediction = async (matchId, h, a) => {
    setSaving(true);
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, home_score: parseInt(h), away_score: parseInt(a) }),
      });
      if (res.ok) {
        setPrediction({ home: parseInt(h), away: parseInt(a), points_earned: 0 });
      }
    } catch {}
    setSaving(false);
    setModalOpen(false);
  };

  const open = isMatchOpen(m);
  const countable = m.counts === 1 || m.fire === 1;

  const openPredict = () => {
    if (!signed) { router.push('/login'); return; }
    setModalOpen(true);
  };

  const TABS = [
    { id: 'rank', icon: '🏆', label: t('md_tab_rank') },
    { id: 'stats', icon: '📊', label: t('md_tab_stats') },
    { id: 'preds', icon: '📝', label: t('md_tab_preds') },
    { id: 'lineup', icon: '👥', label: t('md_tab_lineup') },
    { id: 'details', icon: '📰', label: t('md_tab_details') },
  ];

  return (
    <>
      <TopBar user={user} />
      <div className="main-container md-container">
        <div className="md-card">
          <div className="md-league">
            {m.league_logo ? (
              <img className="league-logo lg-img" src={m.league_logo} alt="" />
            ) : (
              <span className="league-logo" style={{ background: '#2563eb' }}>{m.league_name ? m.league_name.charAt(0) : '؟'}</span>
            )}
            <span className="md-league-name">{m.league_name}</span>
            <span className="mc-points md-pts">{m.fire === 1 ? '🔥' : '⭐'} {m.custom_points === 1 && m.points_value > 0 ? m.points_value : (m.fire === 1 ? 2 : 1)} {t('mc_pts')}</span>
          </div>

          <div className="md-teams">
            <div className="md-team">
              <img className="md-logo" src={m.home_logo || ''} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <span className="md-tname">{teamNameAr(m.home_team)}</span>
            </div>
            <div className="md-score">
              {m.status === 'finished' && <div className="score fin-score md-big">{m.home_score} - {m.away_score}</div>}
              {m.status === 'live' && <div className="score live-score md-big">{m.home_score} - {m.away_score}</div>}
              {m.status === 'upcoming' && <div className="score md-big" style={{ color: 'var(--text-muted)' }}>VS</div>}
              <span className="md-time">{m.status === 'finished' ? t('home_finished') : m.minute || m.match_time}</span>
            </div>
            <div className="md-team">
              <img className="md-logo" src={m.away_logo || ''} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <span className="md-tname">{teamNameAr(m.away_team)}</span>
            </div>
          </div>
        </div>

        <div className="md-tabs">
          {TABS.map((tb) => (
            <button
              type="button"
              key={tb.id}
              className={`md-tab ${tab === tb.id ? 'active' : ''}`}
              onClick={() => setTab(tb.id)}
            >
              <span className="md-tab-icon">{tb.icon}</span>
              <span className="md-tab-label">{tb.label}</span>
            </button>
          ))}
        </div>

        <div className="md-body">
          {tab === 'rank' && <RankTab standings={data.standings || []} home={m.home_team} away={m.away_team} t={t} teamName={teamNameAr} />}
          {tab === 'stats' && <StatsTab h2h={data.h2h || []} formHome={data.formHome || []} formAway={data.formAway || []} home={m.home_team} away={m.away_team} t={t} teamName={teamNameAr} />}
          {tab === 'preds' && <PredsTab stats={stats} preds={data.preds || []} t={t} pct={pct} finished={m.status === 'finished'} />}
          {tab === 'lineup' && <LineupTab t={t} />}
          {tab === 'details' && <DetailsTab m={m} t={t} lang={lang} />}
        </div>
      </div>

      {open && countable && (
        <div className="md-cta-bar">
          <button type="button" className="md-cta-btn" onClick={openPredict}>
            {prediction ? t('pred_update') : t('mc_predict')} ⚽
          </button>
        </div>
      )}

      <PredictModal
        match={m}
        open={modalOpen}
        prediction={prediction}
        saving={saving}
        user={user}
        onSave={savePrediction}
        onClose={() => setModalOpen(false)}
      />
      <BottomNav />
    </>
  );
}

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0;
}

function RankTab({ standings, home, away, t, teamName }) {
  if (!standings.length) {
    return <div className="md-empty">{t('md_no_rank')}</div>;
  }
  return (
    <div className="std-wrap">
      <table className="admin-table std-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('md_team')}</th>
            <th>{t('md_played')}</th>
            <th>{t('md_pts')}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r) => (
            <tr key={r.team} className={(r.team === home || r.team === away) ? 'std-me' : ''}>
              <td className="std-pos">{r.pos}</td>
              <td className="std-team">{teamName(r.team)}</td>
              <td>{r.played}</td>
              <td className="std-pts">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsTab({ h2h, formHome, formAway, home, away, t, teamName }) {
  return (
    <div>
      <div className="std-title">{t('md_form')}</div>
      <div className="md-form-row">
        <div className="md-form-team">
          <span className="md-form-name">{teamName(home)}</span>
          <div className="form-marks">
            {formHome.length ? formHome.map((c, i) => (
              <span key={i} className={`form-mark fm-${c}`}>{c}</span>
            )) : <span className="md-empty small">{t('md_no_form')}</span>}
          </div>
        </div>
        <div className="md-form-team">
          <span className="md-form-name">{teamName(away)}</span>
          <div className="form-marks">
            {formAway.length ? formAway.map((c, i) => (
              <span key={i} className={`form-mark fm-${c}`}>{c}</span>
            )) : <span className="md-empty small">{t('md_no_form')}</span>}
          </div>
        </div>
      </div>

      <div className="std-title">{t('md_h2h')}</div>
      {h2h.length ? (
        <div className="h2h-list">
          {h2h.map((m, i) => (
            <div className="h2h-row" key={i}>
              <span>{teamName(m.home_team)}</span>
              <span className="h2h-score" dir="ltr">{m.home_score} - {m.away_score}</span>
              <span>{teamName(m.away_team)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="md-empty">{t('md_no_h2h')}</div>
      )}
    </div>
  );
}

function PredsTab({ stats, preds, t, pct, finished }) {
  const total = stats.total || 0;
  const bars = [
    { cls: 'pb-win', label: t('md_pred_home'), val: stats.pctHomeW || 0 },
    { cls: 'pb-draw', label: t('md_pred_draw'), val: stats.pctDraw || 0 },
    { cls: 'pb-away', label: t('md_pred_away'), val: stats.pctAwayW || 0 },
  ];
  return (
    <div>
      {!total ? (
        <div className="md-empty">{t('md_no_preds')}</div>
      ) : (
        <>
          <div className="std-title">{t('md_pred_dist')} <span className="md-count">({total})</span></div>
          <div className="pred-bars">
            {bars.map((b, i) => (
              <div className="pred-bar-row" key={i}>
                <span className="pred-bar-lbl">{b.label}</span>
                <div className="pred-bar-track">
                  <span className={`pred-bar-fill ${b.cls}`} style={{ width: `${b.val}%` }}></span>
                </div>
                <span className="pred-bar-val">{b.val}%</span>
              </div>
            ))}
          </div>

          {finished && preds.length > 0 && (
            <>
              <div className="std-title">{t('md_result_ratio')}</div>
              <div className="mc-result-bar md-big-bar">
                <span className="mr-correct" style={{ width: `${stats.pctCorrect}%` }}>✓ {stats.pctCorrect}%</span>
                <span className="mr-wrong" style={{ width: `${stats.pctWrong}%` }}>✗ {stats.pctWrong}%</span>
              </div>
              <div className="pred-list">
                {preds.map((p) => {
                  const good = p.points_earned > 0;
                  return (
                    <div key={p.id} className={`pred-user ${good ? 'ok' : 'no'}`}>
                      <span className="pred-user-avatar">
                        {p.user_avatar ? <img src={p.user_avatar} alt="" /> : (p.user_name ? p.user_name.charAt(0) : '؟')}
                      </span>
                      <span className="pred-user-name">{p.user_name}</span>
                      <span className="pred-user-score" dir="ltr">{p.home_score} - {p.away_score}</span>
                      <span className="pred-user-mark">{good ? '✓' : '✗'}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function LineupTab({ t }) {
  return (
    <div className="md-empty big">
      <div className="icon">👥</div>
      <p>{t('md_lineup_soon')}</p>
    </div>
  );
}

function DetailsTab({ m, t, lang }) {
  const isAr = lang === 'ar';
  const dateStr = m.match_date
    ? new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${m.match_date}T12:00:00`))
    : '';
  return (
    <div>
      <div className="det-row">
        <span className="det-lbl">{t('md_league')}</span>
        <span className="det-val">{m.league_name}</span>
      </div>
      <div className="det-row">
        <span className="det-lbl">{t('md_date')}</span>
        <span className="det-val">{dateStr}</span>
      </div>
      <div className="det-row">
        <span className="det-lbl">{t('md_time')}</span>
        <span className="det-val">{m.match_time}</span>
      </div>
      <div className="det-row">
        <span className="det-lbl">{t('md_status')}</span>
        <span className="det-val">
          {m.status === 'live' ? `🔴 ${t('home_live_now')}` : m.status === 'finished' ? t('home_finished') : t('md_status_upcoming')}
        </span>
      </div>
      <div className="det-row">
        <span className="det-lbl">{t('md_final')}</span>
        <span className="det-val">{m.status === 'finished' ? `${m.home_score} - ${m.away_score}` : '—'}</span>
      </div>
      <div className="md-events">
        <div className="md-empty small">{t('md_events_soon')}</div>
      </div>
    </div>
  );
}