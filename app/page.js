'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';
import PredictModal from '../components/PredictModal';
import { isMatchOpen } from '../lib/client-match-time';
import { teamNameAr } from '../lib/team-names-ar';
import { useI18n } from '../lib/i18n';

const FALLBACK_LOGO = '#2563eb';

function leagueFallback() {
  return FALLBACK_LOGO;
}

function matchBasePoints(m) {
  if (m && m.custom_points === 1 && m.points_value > 0) return m.points_value;
  return m && m.fire === 1 ? 2 : 1;
}

export default function Home() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [modalMatch, setModalMatch] = useState(null);
  const touchStart = useRef(null);
  const router = useRouter();

  async function fetchUser() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setUser(data.user);
  }

  async function fetchFavorites() {
    const res = await fetch('/api/favorites');
    if (res.ok) {
      const data = await res.json();
      setFavorites(data.favorites || []);
    }
  }

  async function fetchPredictionsList() {
    const res2 = await fetch('/api/predictions');
    if (res2.ok) {
      const data2 = await res2.json();
      const preds = {};
      if (data2.predictions) {
        data2.predictions.forEach(p => {
          preds[p.match_id] = { home: p.home_score, away: p.away_score, points_earned: p.points_earned || 0 };
        });
      }
      setPredictions(preds);
    }
  }

  async function fetchMatches() {
    setLoading(true);
    const res = await fetch(`/api/matches?date=${selectedDate}`);
    const data = await res.json();
    setMatches(data.matches || []);
    setLoading(false);
    await fetchPredictionsList();
  }

  useEffect(() => {
    (async () => {
      let onboarded = true;
      try { onboarded = localStorage.getItem('bomba-onboarded') === '1'; } catch {}
      if (!onboarded) {
        try {
          const r = await fetch('/api/auth/me');
          const d = await r.json();
          if (d.user && !d.user.guest) {
            try { localStorage.setItem('bomba-onboarded', '1'); } catch {}
            return;
          }
        } catch {}
        router.replace('/onboarding');
        return;
      }
      fetchUser();
      fetchFavorites();
    })();
  }, []);

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handlePredict = async (matchId, home, away) => {
    if (!user || user.guest) { router.push('/login'); return; }
    setSaving(s => ({...s, [matchId]: true}));
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, home_score: parseInt(home), away_score: parseInt(away) })
    });
    const data = await res.json();
    if (res.ok) {
      setPredictions(p => ({...p, [matchId]: { home: parseInt(home), away: parseInt(away), points_earned: 0 }}));
    }
    setSaving(s => ({...s, [matchId]: false}));
  };

  const toggleFavorite = async (matchId) => {
    if (!user || user.guest) { router.push('/login'); return; }
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId })
    });
    if (res.ok) fetchFavorites();
  };

  const changeDate = (offset) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const favIds = new Set(favorites.map(f => f.match_id));

  const liveMatches = matches.filter(m => m.status === 'live');
  const favMatches = favorites.filter(f => f.match_date === selectedDate);
  const featuredMatch = matches.find(m => m.featured === 1);

  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    changeDate(dx > 0 ? -1 : 1);
  };

  const groupedMatches = {};
  matches.forEach(m => {
    const league = m.league_name || 'غير محدد';
    if (!groupedMatches[league]) groupedMatches[league] = [];
    groupedMatches[league].push(m);
  });

  const openPredict = (m) => {
    if (!user || user.guest) { router.push('/login'); return; }
    setModalMatch(m);
  };

  return (
    <>
      <Navbar user={user} />
      <div className="main-container" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="page-header">
          <h1>⚽ <span className="grad">{t('home_section')}</span></h1>
          <p>{t('home_subtitle')}</p>
        </div>

        {user?.guest && (
          <div className="guest-banner">
            <span>{t('guest_browse_only')}</span>
            <Link href="/login" className="guest-login-btn">{t('guest_login_btn')}</Link>
          </div>
        )}

        <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} todayLabel={t('home_today')} />

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : matches.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📅</div>
            <p>{t('home_no_matches')}</p>
            <p style={{fontSize: '0.85rem', marginTop: 6}}>{t('home_try_other_date')}</p>
          </div>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <div className="league-section">
                <div className="league-header live-hdrs">
                  <span className="league-logo" style={{background: 'var(--live-red)'}}>🔴</span>
                  <span className="league-name">{t('home_live_now')}</span>
                  <span className="match-count">{liveMatches.length} {t('home_matches_count')}</span>
                </div>
                {liveMatches.map(m => (
                  <MatchBlock key={m.id} match={m} user={user}
                    prediction={predictions[m.id]} saving={saving[m.id]}
                    isFav={favIds.has(m.id)} onFav={toggleFavorite} onPredict={openPredict} />
                ))}
              </div>
            )}

            {favMatches.length > 0 && (
              <div className="league-section">
                <div className="league-header fav-hdrs">
                  <span className="league-logo" style={{background: 'var(--gold)'}}>⭐</span>
                  <span className="league-name">{t('home_my_favs')}</span>
                  <span className="match-count">{favMatches.length}</span>
                </div>
                {favMatches.map(m => (
                  <MatchBlock key={`fav-${m.match_id}`} match={{
                    id: m.match_id, home_team: m.home_team, away_team: m.away_team,
                    match_date: m.match_date, match_time: m.match_time, status: m.status,
                    home_score: m.home_score, away_score: m.away_score, minute: m.minute,
                    home_logo: m.home_logo, away_logo: m.away_logo,
                    counts: m.counts, fire: m.fire, custom_points: m.custom_points,
                    points_value: m.points_value,
                    league_name: m.league_name, league_country: '',
                    pred_total: m.pred_total, pred_correct: m.pred_correct
                  }} user={user}
                    prediction={predictions[m.match_id]} saving={saving[m.match_id]}
                    isFav={true} onFav={toggleFavorite} onPredict={openPredict} />
                ))}
              </div>
            )}

            {featuredMatch && (
              <div className="league-section featured-room">
                <div className="featured-banner">
                  <div className="featured-tag">{t('home_featured_banner')}</div>
                  <div className="featured-desc">{t('home_featured_desc')}</div>
                </div>
                <MatchBlock key={`featured-${featuredMatch.id}`} match={featuredMatch} user={user}
                  prediction={predictions[featuredMatch.id]} saving={saving[featuredMatch.id]}
                  isFav={favIds.has(featuredMatch.id)} onFav={toggleFavorite} onPredict={openPredict} />
              </div>
            )}

            {Object.entries(groupedMatches).map(([league, leagueMatches]) => (
              <div className="league-section" key={league}>
                <div className="league-header">
                  {leagueMatches[0].league_logo ? (
                    <img className="league-logo lg-img" src={leagueMatches[0].league_logo} alt="" />
                  ) : (
                    <span className="league-logo" style={{background: leagueFallback()}}>
                      {(league.charAt(0) || '؟')}
                    </span>
                  )}
                  <div>
                    <div className="league-name">{league}</div>
                    <div className="league-country">{leagueMatches[0].league_country}</div>
                  </div>
                  <span className="match-count">{leagueMatches.length} {t('home_matches_count')}</span>
                </div>
                {leagueMatches.map(m => (
                  <MatchBlock key={m.id} match={m} user={user}
                    prediction={predictions[m.id]} saving={saving[m.id]}
                    isFav={favIds.has(m.id)} onFav={toggleFavorite} onPredict={openPredict} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      <PredictModal
        match={modalMatch}
        open={!!modalMatch}
        prediction={modalMatch ? predictions[modalMatch.id] : null}
        saving={modalMatch ? saving[modalMatch.id] : false}
        user={user}
        onSave={handlePredict}
        onClose={() => setModalMatch(null)}
      />

      <MobileNav user={user} />
    </>
  );
}

function Logo({ src, size }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img className="team-logo" src={src} alt="" style={size ? { width: size, height: size, objectFit: 'contain' } : { objectFit: 'contain' }} onError={() => setErr(true)} />;
  }
  return <span className="mini-logo" style={size ? { width: size, height: size, fontSize: Math.round(size * 0.36) } : undefined}>⚽</span>;
}

function DateStrip({ selectedDate, onSelect, todayLabel }) {
  const { lang } = useI18n();
  const dateInputRef = useRef(null);

  const days = [];
  const base = new Date(selectedDate + 'T12:00:00');
  const baseIso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  for (let i = -2; i <= 2; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      iso,
      dow: new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { weekday: 'narrow' }).format(d),
      num: d.getDate(),
      month: new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { month: 'short' }).format(d),
      isToday: iso === todayIso,
    });
  }

  const openCalendar = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try { dateInputRef.current.showPicker(); return; } catch {}
      }
      dateInputRef.current.click();
    }
  };

  return (
    <div className="date-strip">
      <button type="button" className="ds-arrow" onClick={openCalendar} title={todayLabel}>📅</button>
      <div className="ds-days">
        {days.map((d) => (
          <button
            type="button"
            key={d.iso}
            className={`ds-day ${d.iso === selectedDate ? 'active' : ''} ${d.isToday ? 'today' : ''}`}
            onClick={() => onSelect(d.iso)}
          >
            <span className="ds-dow">{d.dow}</span>
            <span className="ds-num" dir="ltr">{d.num}</span>
            <span className="ds-month">{d.month}</span>
          </button>
        ))}
      </div>
      <button type="button" className="ds-arrow" onClick={openCalendar}>📅</button>
      <input
        ref={dateInputRef}
        type="date"
        value={baseIso}
        onChange={(e) => e.target.value && onSelect(e.target.value)}
        style={{ position: 'absolute', visibility: 'hidden' }}
        tabIndex={-1}
      />
    </div>
  );
}

function MatchBlock({ match, user, prediction, saving, isFav, onFav, onPredict }) {
  const { t } = useI18n();
  const router = useRouter();
  const countable = match.counts === 1 || match.fire === 1;
  const open = isMatchOpen(match);
  const status = match.status;

  const totalPreds = Number(match.pred_total || 0);
  const correctPreds = Number(match.pred_correct || 0);
  const pctCorrect = totalPreds ? Math.round((correctPreds / totalPreds) * 100) : 0;
  const pctWrong = 100 - pctCorrect;

  let finClass = '';
  if (status === 'finished') {
    if (prediction) {
      finClass = prediction.points_earned > 0 ? 'res-good' : 'res-bad';
    }
  }

  const pts = matchBasePoints(match);
  const fire = match.fire === 1;

  return (
    <div
      className={`match-card ${finClass}`}
      onClick={() => router.push(`/match/${match.id}`)}
    >
      <div className="mc-top">
        <span className="mc-points">{fire ? '🔥' : '⭐'} {pts} {t('mc_pts')}</span>
        <span className="mc-info">
          {status === 'live' && <span className="live-dot"></span>}
          {status === 'live' ? (match.minute ? match.minute : t('home_live_now')) : (match.match_time || '')}
        </span>
        <button
          type="button"
          className={`star-btn mc-fav ${isFav ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onFav(match.id); }}
          title={isFav ? t('home_unfav') : t('home_fav')}
        >
          {isFav ? '★' : '☆'}
        </button>
      </div>

      <div className="mc-teams">
        <div className="mc-team home">
          <Logo src={match.home_logo} />
          <span className="t-name">{teamNameAr(match.home_team)}</span>
        </div>
        <div className="mc-center">
          {status === 'live' && (
            <div className="score live-score">{match.home_score} - {match.away_score}</div>
          )}
          {status === 'finished' && (
            <div className="score fin-score">{match.home_score} - {match.away_score}</div>
          )}
          {status === 'upcoming' && (
            <div className="score" style={{color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem'}}>VS</div>
          )}
        </div>
        <div className="mc-team away">
          <span className="t-name">{teamNameAr(match.away_team)}</span>
          <Logo src={match.away_logo} />
        </div>
      </div>

      {(status === 'live' || status === 'finished') && (
        <div className="mc-result-bar">
          <span className="mr-correct" style={{ width: `${pctCorrect}%` }}>✓ {pctCorrect}%</span>
          <span className="mr-wrong" style={{ width: `${pctWrong}%` }}>✗ {pctWrong}%</span>
        </div>
      )}

      <div className="mc-actions">
        <button
          type="button"
          className="mc-stats"
          onClick={(e) => { e.stopPropagation(); router.push(`/match/${match.id}?tab=stats`); }}
        >
          📊 {t('mc_stats')}
        </button>
        {open && countable ? (
          <button
            type="button"
            className="mc-predict"
            onClick={(e) => { e.stopPropagation(); onPredict(match); }}
            disabled={saving}
          >
            {prediction ? t('mc_edit') : t('mc_predict')}
          </button>
        ) : (
          <span className="mc-closed">
            {!countable && open ? t('home_view_only') : status === 'finished' ? t('mc_finished') : t('mc_closed')}
          </span>
        )}
      </div>
    </div>
  );
}

function Navbar({ user }) {
  return <TopBar user={user} />;
}

function MobileNav({ user }) {
  return <BottomNav />;
}