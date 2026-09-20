const db = require('./lib/db');
const bcrypt = require('bcryptjs');

async function main() {
  const today = new Date().toISOString().split('T')[0];

  const leagues = {
    'الدوري الإنجليزي': 'الدوري الإنجليزي',
    'الدوري الإسباني': 'الدوري الإسباني',
    'الدوري الإيطالي': 'الدوري الإيطالي',
    'الدوري الألماني': 'الدوري الألماني',
    'الدوري الفرنسي': 'الدوري الفرنسي',
    'دوري أبطال أوروبا': 'دوري أبطال أوروبا',
    'الدوري السعودي': 'الدوري السعودي',
  };

  const sampleMatches = [
    ['الدوري الإنجليزي', 'مانشستر سيتي', 'ليفربول', today, '18:30', 'live', 2, 1, "67'"],
    ['الدوري الإنجليزي', 'آرسنال', 'تشيلسي', today, '21:00', 'upcoming', 0, 0, ''],
    ['الدوري الإسباني', 'ريال مدريد', 'برشلونة', today, '22:00', 'upcoming', 0, 0, ''],
    ['الدوري الإيطالي', 'يوفنتوس', 'إنتر ميلان', today, '21:45', 'upcoming', 0, 0, ''],
    ['الدوري الألماني', 'بايرن ميونخ', 'دورتموند', today, '19:30', 'finished', 3, 2, ''],
    ['الدوري السعودي', 'الهلال', 'النصر', today, '20:00', 'upcoming', 0, 0, ''],
    ['دوري أبطال أوروبا', 'باريس سان جيرمان', 'مانشستر سيتي', today, '22:00', 'upcoming', 0, 0, ''],
  ];

  const checkCount = (await db.prepare('SELECT COUNT(*) as count FROM matches WHERE match_date = ?').get(today)).count;
  if (checkCount === 0) {
    for (const [leagueName, home, away, date, time, status, hs, as, minute] of sampleMatches) {
      const league = await db.prepare('SELECT id FROM leagues WHERE name = ?').get(leagueName);
      if (league) {
        await db.prepare(`
          INSERT INTO matches (league_id, home_team, away_team, match_date, match_time, status, home_score, away_score, minute)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(league.id, home, away, date, time, status, hs, as, minute);
      }
    }
    console.log('تم إضافة مباريات تجريبية لليوم');
  } else {
    console.log('توجد مباريات مسبقاً لهذا اليوم');
  }

  const demoUser = await db.prepare('SELECT id FROM users WHERE phone = ?').get('0555555555');
  if (!demoUser) {
    const hash = bcrypt.hashSync('1234', 10);
    await db.prepare('INSERT INTO users (name, phone, password, points) VALUES (?, ?, ?, ?)').run('مستخدم تجريبي', '0555555555', hash, 15);
    console.log('تم إضافة مستخدم تجريبي: 0555555555 / 1234');
  }

  console.log('تم تجهيز قاعدة البيانات');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });