const db = require('./db');

function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

async function claim(userId, action, day, bombs) {
  const exists = await db.prepare('SELECT id FROM rewards_claims WHERE user_id = ? AND action = ? AND day = ?').get(userId, action, day);
  if (exists) {
    const u = await db.prepare('SELECT bombs FROM users WHERE id = ?').get(userId);
    return { claimed: false, bombs: u ? u.bombs : 0 };
  }
  await db.prepare('INSERT INTO rewards_claims (user_id, action, day, bombs) VALUES (?, ?, ?, ?)').run(userId, action, day, bombs);
  await db.prepare('UPDATE users SET bombs = bombs + ? WHERE id = ?').run(bombs, userId);
  const u = await db.prepare('SELECT bombs FROM users WHERE id = ?').get(userId);
  return { claimed: true, bombs: u ? u.bombs : 0 };
}

async function ensureInviteCode(user) {
  if (user.invite_code) return user.invite_code;
  const code = 'BM' + String(user.name || 'U').replace(/\s+/g, '').toUpperCase().slice(0, 4) + user.id;
  await db.prepare('UPDATE users SET invite_code = ? WHERE id = ?').run(code, user.id);
  return code;
}

module.exports = { claim, today, ensureInviteCode };