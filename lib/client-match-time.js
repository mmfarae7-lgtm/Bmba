export function kickoffMs(match) {
  if (!match || !match.match_date || !/^\d{4}-\d{2}-\d{2}$/.test(match.match_date)) return null;
  const t = match.match_time || '00:00';
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return null;
  const parts = t.split(':');
  const hh = String(parts[0]).padStart(2, '0');
  const mm = String(parts[1]).padStart(2, '0');
  const d = new Date(`${match.match_date}T${hh}:${mm}:00+03:00`);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export function isMatchStarted(match, now = Date.now()) {
  if (!match) return false;
  if (match.status === 'live' || match.status === 'finished') return true;
  const ko = kickoffMs(match);
  return ko != null && now >= ko;
}

export function isMatchOpen(match, now = Date.now()) {
  return !isMatchStarted(match, now);
}