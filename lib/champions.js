const db = require('./db');

const LEAGUES = {
  EPL: { name: 'الدوري الإنجليزي الممتاز', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LIGA: { name: 'الدوري الإسباني', icon: '🇪🇸' },
  SAU: { name: 'دوري روشن السعودي', icon: '🇸🇦' },
  UCL: { name: 'دوري أبطال أوروبا', icon: '🏆' },
};

const CATEGORIES = {
  champion: { name: 'بطل الدوري', icon: '👑', hint: 'من سيتوّج بطلاً في نهاية الموسم؟' },
  top_scorer: { name: 'الهداف', icon: '⚽', hint: 'من سيتصدّر ترتيب الهدافين بنهاية الموسم؟' },
  best_player: { name: 'أفضل لاعب', icon: '⭐', hint: 'من سيفوز بجائزة أفضل لاعب في الموسم؟' },
};

const OPTIONS = {
  EPL: {
    champion: ['مانشستر سيتي', 'آرسنال', 'ليفربول', 'تشيلسي', 'نيوكاسل', 'مانشستر يونايتد'],
    top_scorer: ['إيرلينغ هالاند', 'بوكايو ساكا', 'كول بالمر', 'محمد صلاح', 'ألكسندر إيساك'],
    best_player: ['إيرلينغ هالاند', 'بوكايو ساكا', 'رودري', 'كول بالمر', 'فيل فودن'],
  },
  LIGA: {
    champion: ['ريال مدريد', 'برشلونة', 'أتلتيكو مدريد', 'أتلتيكو بيلباو'],
    top_scorer: ['كيليان مبابي', 'فينيسيوس جونيور', 'روبرت ليفاندوفسكي', 'لامين يامال'],
    best_player: ['فينيسيوس جونيور', 'جود بيلينغهام', 'كيليان مبابي', 'لامين يامال'],
  },
  SAU: {
    champion: ['الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'الشباب'],
    top_scorer: ['كرستيانو رونالدو', 'سالم الدوسري', 'موسى ديابي', 'ماركوس ليوناردو'],
    best_player: ['كرستيانو رونالدو', 'سالم الدوسري', 'رياض محرز', 'فرانك كيسي'],
  },
  UCL: {
    champion: ['ريال مدريد', 'مانشستر سيتي', 'بايرن ميونخ', 'باريس سان جيرمان', 'آرسنال', 'ليفربول', 'برشلونة'],
    top_scorer: ['إيرلينغ هالاند', 'كيليان مبابي', 'فينيسيوس جونيور', 'روبرت ليفاندوفسكي'],
    best_player: ['فينيسيوس جونيور', 'جود بيلينغهام', 'كيليان مبابي', 'رودري', 'لامين يامال'],
  },
};

function getOptions(league, category) {
  return OPTIONS[league]?.[category] || [];
}

async function myAnswers(userId, league) {
  if (!league) {
    const rows = await db.prepare('SELECT category, league, answer FROM champion_predictions WHERE user_id = ?').all(userId);
    const map = {};
    for (const r of rows) {
      if (!map[r.league]) map[r.league] = {};
      map[r.league][r.category] = r.answer;
    }
    return map;
  }
  const rows = await db.prepare('SELECT category, answer FROM champion_predictions WHERE user_id = ? AND league = ?').all(userId, league);
  const map = {};
  for (const r of rows) map[r.category] = r.answer;
  return map;
}

async function resultsMap() {
  const rows = await db.prepare('SELECT category, league, winner, award_bombs FROM champion_results').all();
  const map = {};
  for (const r of rows) {
    if (!map[r.league]) map[r.league] = {};
    map[r.league][r.category] = { winner: r.winner, award_bombs: r.award_bombs };
  }
  return map;
}

module.exports = { LEAGUES, CATEGORIES, OPTIONS, getOptions, myAnswers, resultsMap };