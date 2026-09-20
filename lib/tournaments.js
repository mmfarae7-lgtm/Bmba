const CATEGORIES = [
  { id: 'local', ar: '🔹 أقوى البطولات المحلية', en: '🔹 Top Domestic Leagues' },
  { id: 'club', ar: '🔹 بطولات الاتحادات القارية للأندية', en: '🔹 Continental Club Competitions' },
  { id: 'national', ar: '🔹 بطولات الاتحادات القارية للمنتخبات', en: '🔹 Continental National Teams Competitions' },
  { id: 'world', ar: '🔹 البطولات العالمية (الفيفا)', en: '🔹 FIFA World Competitions' },
];

const TOURNAMENTS = [
  { slug: 'english-premier-league', category: 'local', ar: 'الدوري الإنجليزي', en: 'English Premier League', emoji: '🇬🇧', ids: [39], names: ['الدوري الإنجليزي الممتاز', 'الدوري الإنجليزي'] },
  { slug: 'la-liga', category: 'local', ar: 'الدوري الإسباني', en: 'La Liga', emoji: '🇪🇸', ids: [140], names: ['الدوري الإسباني'] },
  { slug: 'serie-a', category: 'local', ar: 'الدوري الإيطالي', en: 'Serie A', emoji: '🇮🇹', ids: [135], names: ['الدوري الإيطالي'] },
  { slug: 'bundesliga', category: 'local', ar: 'الدوري الألماني', en: 'Bundesliga', emoji: '🇩🇪', ids: [78], names: ['الدوري الألماني'] },
  { slug: 'ligue-1', category: 'local', ar: 'الدوري الفرنسي', en: 'Ligue 1', emoji: '🇫🇷', ids: [61], names: ['الدوري الفرنسي'] },
  { slug: 'saudi-pro-league', category: 'local', ar: 'دوري روشن السعودي', en: 'Saudi Pro League', emoji: '🇸🇦', ids: [307], names: ['دوري روشن السعودي'] },

  { slug: 'uefa-champions-league', category: 'club', ar: 'دوري أبطال أوروبا', en: 'UEFA Champions League', emoji: '⭐', ids: [2], names: ['دوري أبطال أوروبا'] },
  { slug: 'caf-champions-league', category: 'club', ar: 'دوري أبطال إفريقيا', en: 'CAF Champions League', emoji: '🌍', ids: [18], names: ['دوري أبطال أفريقيا', 'دوري أبطال إفريقيا'] },
  { slug: 'afc-champions-league', category: 'club', ar: 'دوري أبطال آسيا', en: 'AFC Champions League', emoji: '🌏', ids: [5, 17], names: ['دوري أبطال آسيا', 'دوري أبطال آسيا النخبة'] },
  { slug: 'uefa-europa-league', category: 'club', ar: 'الدوري الأوروبي', en: 'UEFA Europa League', emoji: '🌟', ids: [3], names: ['الدوري الأوروبي'] },

  { slug: 'euro-championship', category: 'national', ar: 'كأس الأمم الأوروبية', en: 'UEFA European Championship', emoji: '🇪🇺', ids: [], names: ['كأس الأمم الأوروبية', 'يورو'] },
  { slug: 'copa-america', category: 'national', ar: 'كوبا أمريكا', en: 'Copa América', emoji: '🌎', ids: [], names: ['كوبا أمريكا'] },
  { slug: 'afcon', category: 'national', ar: 'كأس أمم أفريقيا', en: 'Africa Cup of Nations', emoji: '⚽', ids: [], names: ['كأس أمم أفريقيا', 'كأس الامم الافريقية'] },
  { slug: 'asian-cup', category: 'national', ar: 'كأس أمم آسيا', en: 'AFC Asian Cup', emoji: '🏅', ids: [], names: ['كأس أمم آسيا'] },

  { slug: 'fifa-world-cup', category: 'world', ar: 'كأس العالم للمنتخبات', en: 'FIFA World Cup', emoji: '🌐', ids: [1], names: ['كأس العالم'] },
  { slug: 'fifa-club-world-cup', category: 'world', ar: 'كأس العالم للأندية', en: 'FIFA Club World Cup', emoji: '🏆', ids: [15], names: ['كأس العالم للأندية'] },
];

function getTournament(slug) {
  return TOURNAMENTS.find((t) => t.slug === slug) || null;
}

function getCategory(category) {
  return CATEGORIES.find((c) => c.id === category) || null;
}

function tournamentsByCategory() {
  return CATEGORIES.map((c) => ({
    ...c,
    tournaments: TOURNAMENTS.filter((t) => t.category === c.id),
  }));
}

module.exports = { CATEGORIES, TOURNAMENTS, getTournament, getCategory, tournamentsByCategory };