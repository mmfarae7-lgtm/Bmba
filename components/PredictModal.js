'use client';
import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { teamNameAr } from '../lib/team-names-ar';

function PM_Logo({ src }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img className="pm-logo" src={src} alt="" onError={() => setErr(true)} />;
  }
  return <span className="pm-logo mini">⚽</span>;
}

export default function PredictModal({ match, open, prediction, saving, user, onSave, onClose }) {
  const { t } = useI18n();
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setHome(prediction?.home?.toString() || '');
      setAway(prediction?.away?.toString() || '');
      setSaved(false);
    }
  }, [open, prediction]);

  if (!open || !match) return null;

  const submit = () => {
    if (home === '' || away === '') return;
    onSave(match.id, home, away);
    setSaved(true);
    onClose();
  };

  const quick = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 0], [0, 1]];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="predict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-head">
          <span className="pm-title">{t('pred_title')}</span>
          <button className="pm-close" onClick={onClose}>✕</button>
        </div>

        <div className="pm-teams">
          <div className="pm-team">
            <PM_Logo src={match.home_logo} />
            <span>{teamNameAr(match.home_team)}</span>
          </div>
          <span className="pm-vs">VS</span>
          <div className="pm-team">
            <span>{teamNameAr(match.away_team)}</span>
            <PM_Logo src={match.away_logo} />
          </div>
        </div>

        <div className="pm-topic">{match.league_name}</div>

        <div className="pm-inputs">
          <input
            type="number" min="0" max="20" inputMode="numeric"
            placeholder="0"
            value={home}
            onChange={(e) => setHome(e.target.value)}
          />
          <span className="pm-sep">-</span>
          <input
            type="number" min="0" max="20" inputMode="numeric"
            placeholder="0"
            value={away}
            onChange={(e) => setAway(e.target.value)}
          />
        </div>

        <div className="pm-quick">
          {quick.map(([h, a], i) => (
            <button
              type="button"
              key={i}
              className={`pm-q ${home === String(h) && away === String(a) ? 'active' : ''}`}
              onClick={() => { setHome(String(h)); setAway(String(a)); setSaved(false); }}
            >
              {h}-{a}
            </button>
          ))}
        </div>

        <button type="button" className="pm-submit" disabled={saving || home === '' || away === ''} onClick={submit}>
          {saving ? '...' : saved ? '✓' : prediction ? t('pred_update') : t('pred_confirm')}
        </button>
      </div>
    </div>
  );
}