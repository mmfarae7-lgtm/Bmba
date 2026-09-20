'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { isMatchOpen } from '../../lib/client-match-time';
import { teamNameAr } from '../../lib/team-names-ar';
import { useI18n } from '../../lib/i18n';

export default function Room() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const router = useRouter();

  async function fetchUser() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setUser(data.user);
  }

  async function fetchMatches() {
    setLoading(true);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
    const res = await fetch(`/api/matches?date=${today}`);
    const data = await res.json();
    setMatches(data.matches || []);
    setLoading(false);
    const res2 = await fetch('/api/predictions');
    if (res2.ok) {
      const data2 = await res2.json();
      const preds = {};
      if (data2.predictions) {
        data2.predictions.forEach(p => {
          preds[p.match_id] = { home: p.home_score, away: p.away_score };
        });
      }
      setPredictions(preds);
    }
  }

  useEffect(() => {
    fetchUser();
    fetchMatches();
  }, []);

  const handlePredict = async (matchId, home, away) => {
    if (!user) { router.push('/login'); return; }
    setSaving(s => ({...s, [matchId]: true}));
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, home_score: parseInt(home), away_score: parseInt(away) })
    });
    const data = await res.json();
    if (res.ok) {
      setPredictions(p => ({...p, [matchId]: { home: parseInt(home), away: parseInt(away) }}));
    }
    setSaving(s => ({...s, [matchId]: false}));
  };

  const countable = matches.filter(m => (m.counts === 1 || m.fire === 1) && isMatchOpen(m));
  const closed = matches.filter(m => (m.counts === 1 || m.fire === 1) && !isMatchOpen(m));
  const featured = matches.find(m => m.featured === 1 && isMatchOpen(m));
  const predictedIds = new Set(Object.keys(predictions).map(Number));
  const done = countable.filter(m => predictedIds.has(m.id)).length;

  const list = featured ? [featured, ...countable.filter(m => m.id !== featured.id)] : countable;

  return (
    <>
      <Navbar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>⭐ <span className="grad">{t('room_title')}</span></h1>
          <p>{t('room_subtitle')}</p>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <>
            <div className="room-progress">
              <div className="room-progress-top">
                <span>{t('room_progress')}</span>
                <span className="room-progress-count">{done} / {countable.length}</span>
              </div>
              <div className="room-progress-bar">
                <div className="room-progress-fill" style={{width: countable.length ? `${(done / countable.length) * 100}%` : '0%'}}></div>
              </div>
              {done === countable.length && countable.length > 0 && (
                <div className="room-complete">{t('room_complete')}</div>
              )}
            </div>

            {list.length === 0 && closed.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎯</div>
                <p>{t('room_empty')}</p>
                <p style={{fontSize: '0.85rem', marginTop: 6}}>{t('room_empty_sub')}</p>
              </div>
            ) : (
              <>
              {list.length === 0 && closed.length > 0 && (
                <div className="empty-state">
                  <div className="icon">⏱️</div>
                  <p>{t('room_all_started')}</p>
                  <p style={{fontSize: '0.85rem', marginTop: 6}}>{t('room_comeback')}</p>
                </div>
              )}
              <div style={{display: 'grid', gap: 12}}>
                {list.map(m => {
                  const isFeatured = m.featured === 1 && m.id === featured?.id;
                  return (
                    <div key={m.id} className={`room-match ${isFeatured ? 'room-match-featured' : ''} ${predictedIds.has(m.id) ? 'room-match-done' : ''}`}>
                      {isFeatured && (
                        <div className="room-featured-tag">{t('room_featured_tag')}</div>
                      )}
                      <div className="room-match-status">
                        {predictedIds.has(m.id) ? (
                          <span className="room-pred-done">{t('room_predicted')}: {predictions[m.id].home} - {predictions[m.id].away}</span>
                        ) : (
                          <span className="room-pred-pending">{t('room_not_predicted')}</span>
                        )}
                        {m.fire === 1 && <span className="room-fire">{t('home_fire_tag2')}</span>}
                      </div>
                      <MatchBlock match={m} user={user} prediction={predictions[m.id]} saving={saving[m.id]}
                        onSave={handlePredict} />
                    </div>
                  );
                })}
              </div>
              {closed.length > 0 && (
                <div className="room-closed">
                  <div className="room-closed-title">{t('room_closed')} ({closed.length})</div>
                  {closed.map(m => (
                    <div key={m.id} className="room-closed-match">
                      <span>{teamNameAr(m.home_team)} - {teamNameAr(m.away_team)}</span>
                      <span className="room-closed-state">{m.status === 'finished' ? t('room_ended') : m.status === 'live' ? t('room_live') : `${t('room_started_at')} ${m.match_time}`}</span>
                    </div>
                  ))}
                </div>
              )}
              </>
            )}
          </>
        )}
      </div>

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

function MatchBlock({ match, user, prediction, saving, onSave }) {
  const { t } = useI18n();
  const [home, setHome] = useState(prediction?.home?.toString() || '');
  const [away, setAway] = useState(prediction?.away?.toString() || '');
  const [saved, setSaved] = useState(!!prediction);

  useEffect(() => {
    if (prediction) {
      setHome(prediction.home?.toString() || '');
      setAway(prediction.away?.toString() || '');
      setSaved(true);
    }
  }, [prediction]);

  const handleSave = () => {
    if (home === '' || away === '') return;
    onSave(match.id, home, away);
    setSaved(true);
  };

  return (
    <div className="match-shell">
      <div className="match-row">
        <div className="mteam home">
          <Logo src={match.home_logo} />
          <span className="t-name">{teamNameAr(match.home_team)}</span>
        </div>
        <div className="mcenter">
          <span className="ktime">{match.match_time}</span>
        </div>
        <div className="mteam away">
          <span className="t-name">{teamNameAr(match.away_team)}</span>
          <Logo src={match.away_logo} />
        </div>
      </div>
      <div className="pred-line">
        <span className="pred-label">{t('pred_your')}</span>
        <input type="number" min="0" max="20" value={home}
          onChange={e => {setHome(e.target.value); setSaved(false);}}
          placeholder="0" />
        <span className="vs">-</span>
        <input type="number" min="0" max="20" value={away}
          onChange={e => {setAway(e.target.value); setSaved(false);}}
          placeholder="0" />
        {saved ? (
          <span className="pred-saved">{t('pred_saved')}</span>
        ) : (
          <button className="pred-save" onClick={handleSave} disabled={saving || !user}>
            {!user ? t('pred_login') : saving ? '...' : t('pred_save')}
          </button>
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