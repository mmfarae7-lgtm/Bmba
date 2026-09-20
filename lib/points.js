const db = require('./db');

async function totalActiveMembers() {
  const row = await db.prepare('SELECT COUNT(*) as c FROM users WHERE blocked = 0').get();
  return row?.c || 0;
}

// ——— نقاط النظام الجديد (الطلب ٣) ———
// عادية: دقيقة = 3 | فوز/تعادل صحيح = 1
// نارية: دقيقة = 5 | فوز/تعادل صحيح = 2
// دقيقة + نسبة المتوقعين لها ≥10% من إجمالي الأعضاء: عادية = 4 | نارية = 6
// مخصصة (custom_points): نتيجة دقيقة فقط = points_value.
function exactPoints(fire, crowdExact, customPts) {
  if (customPts > 0) return customPts;
  return fire ? (crowdExact ? 6 : 5) : (crowdExact ? 4 : 3);
}

async function calculatePointsForMatch(matchId) {
  const match = await db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || match.status !== 'finished') return;

  const predictions = await db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(matchId);
  if (predictions.length === 0) return;

  const fire = match.fire === 1;
  const isCustom = match.custom_points === 1;
  const customPts = isCustom && match.points_value > 0 ? match.points_value : 0;

  // نسبة من توقعوا نفس النتيجة الدقيقة الصحيحة ≥10% من إجمالي الأعضاء
  const exactPredictions = predictions.filter(
    (p) => p.home_score === match.home_score && p.away_score === match.away_score
  );
  const members = await totalActiveMembers();
  const crowdExact = members > 0 && exactPredictions.length / members >= 0.10;

  for (const pred of predictions) {
    if (pred.points_earned > 0) {
      await db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(pred.points_earned, pred.user_id);
    }

    let pts = 0;
    const exact = pred.home_score === match.home_score && pred.away_score === match.away_score;
    if (exact) {
      pts = exactPoints(fire, crowdExact, customPts);
    } else if (!isCustom) {
      const predOutcome = pred.home_score > pred.away_score ? 'H' : pred.home_score < pred.away_score ? 'A' : 'D';
      const matchOutcome = match.home_score > match.away_score ? 'H' : match.home_score < match.away_score ? 'A' : 'D';
      if (predOutcome === matchOutcome) {
        pts = fire ? 2 : 1; // فوز/تعادل صحيح بدون نتيجة دقيقة
      }
    }

    await db.prepare('UPDATE predictions SET points_earned = ?, unique_bonus = 0 WHERE id = ?').run(pts, pred.id);

    if (pts > 0) {
      await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(pts, pred.user_id);
      let reasons = [];
      if (exact) {
        if (isCustom) reasons.push(`نتيجة دقيقة (نقاط مخصصة ${pts})`);
        else if (fire) reasons.push(crowdExact ? 'نتيجة دقيقة نارية (نسبة المتوقعين ≥10%)' : 'نتيجة دقيقة نارية');
        else reasons.push(crowdExact ? 'نتيجة دقيقة (نسبة المتوقعين ≥10%)' : 'نتيجة دقيقة');
      } else {
        reasons.push(fire ? 'فوز/تعادل صحيح (ناري)' : 'فوز/تعادل صحيح');
      }
      await db.prepare('INSERT INTO point_logs (user_id, points, reason, admin_id) VALUES (?, ?, ?, NULL)')
        .run(pred.user_id, pts, `${match.home_team} vs ${match.away_team}: ${reasons.join('، ')}`);
    }
  }
}

module.exports = { calculatePointsForMatch, exactPoints };
