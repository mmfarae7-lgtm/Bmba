# 🎯 دليل استمرار العمل — Bmba لتوقعات (HANDOFF)

> يُستخدم هذا الدليل لاستئناف العمل من أي جهاز / أي OpenCode آخر.
> كل المفاتيح والأسرار تُستخرج من مكانها (Vercel / Turso / api-sports) ولا تُكتب هنا.

---

## 🔗 روابط سريعة

| الشيء | الرابط / القيمة |
|---|---|
| الموقع الحي (Production) | https://bmba-app.vercel.app |
| مشروع Vercel | `bmba` — https://vercel.com/bmba/bmba |
| GitHub (المستودع) | https://github.com/mmfarae7-lgtm/Bmba |
| حساب Vercel CLI | `mmfarae7-4361` |
| حساب GitHub | `mmfarae7-lgtm` |
| الرابط النسخة الاحتياطية (Deployment) | يتغيّر مع كل رفع (https://bmba-xxxxx-bmba.vercel.app) |

---

## 🧱 التقنية والبنية

- **Stack:** Next.js **16.3.5** (App Router) + React 19 + JavaScript (بدون TypeScript فعلي).
- **قاعدة بيانات:** SQLite عبر `@libsql/client` محلياً (`bomba.db`) / **Turso** سحابياً في الإنتاج.
- **المصادقة:** JWT في كوكي `token` (7 أيام) + كوكي ضيف `guest` (lib/auth.js).

### بنية المجلدات
```
app/            صفحات التطبيق (App Router)
app/api/        واجهات REST: auth, matches, predictions, admin, arena, champions,
                chat, coach, favorites, leaderboard, notifications, rewards, store, tournaments
lib/            المنطق: db.js, auth.js, points.js, rewards.js, questions.js, i18n.js,
                sports-api.js, match-time.js, coach.js, champions.js ...
components/     TopBar, BottomNav, PredictModal, RegisterForm, LoginMethods ...
public/         أيقونات + manifest.json + sw.js (PWA)
proxy.js        Middleware: توجيه / ↔ /onboarding بالكوكي bomba-onboarded
```

### ملفات مهمة
| ملف | وظيفته |
|---|---|
| `lib/db.js` | يعمل البنية (Schema) + البذر (leagues/players/store) + **منح هدية 100 بمبا للأعضاء القدامى** (مرة واحدة) |
| `lib/auth.js` | JWT + requireAuth / requireAdmin / requireSuperAdmin |
| `lib/questions.js` | مصرف 64 سؤالاً رياضياً + pickRandomQuestions (عشوائية لكل مشترك) |
| `lib/rewards.js` | claim / ensureInviteCode |
| `app/api/rewards/*` | ads (لا يمنع حالياً)، questions، share، invite، notifications |
| `app/rewards/page.js` | صفحة المكافئات «اكسب بمبات» |
| `backfill-welcome.js` | سكربت منح 100 بمبا للأعضاء الحاليين (محلي + سحابي) |

---

## 🚀 التشغيل المحلي

```bash
git clone https://github.com/mmfarae7-lgtm/Bmba.git
cd Bmba
npm install
cp .env.example .env.local   # ثم عبّئ JWT_SECRET بقيمة عشوائية طويلة
npm run dev                  # → http://localhost:3000
```

**دخول المشرف (يُنشأ تلقائياً عند أول تشغيل):**
- رقم الجوال: `7777777` — كلمة المرور: `admin123`

---

## 🔐 متغيرات البيئة

| المتغير | من أين تستخرجه | هل هو ضروري |
|---|---|---|
| `JWT_SECRET` | قيمة عشوائية طويلة من عندك | ✅ دائماً (في الإنتاج يرمي خطأً إن غاب) |
| `SPORTS_API_KEY` | لوحة api-sports.io | اختياري (بيانات المباريات) |
| `TURSO_DATABASE_URL` | لوحة Turso → Database → General | في Vercel فقط |
| `TURSO_AUTH_TOKEN` | لوحة Turso → Generate API Token | في Vercel فقط |

> ⚠️ **مهم:** Vercel يحفظ هذه القيم كنوع Secret ولا تُسحب عبر `vercel env pull` (ترجع `[SENSITIVE]`).
> لاستخراجها الحقيقي: ادخل لوحة **Turso** (app.turso.tech) بنفس الحساب واحصل على `url` + `token`.
> ثم ضعها في Vercel يدوياً: Project → Settings → Environment Variables.

---

## 🌐 الرفع إلى Vercel (الإنتاج)

```bash
npx vercel login          # مرة واحدة فقط (الحساب mmfarae7-4361)
npm run build             # فحص قبل الرفع
npx vercel --prod --yes   # رفع مباشر إلى الإنتاج
```

- الموقع النهائي المرتبط بالدومين: https://bmba-app.vercel.app
- ملاحظة: أمر `vercel env pull` يُخرج قيماً شكلية `[SENSITIVE]` للأسرار — تجاهله للأسرار.

---

## 🐙 GitHub

```bash
git remote -v             # origin = https://github.com/mmfarae7-lgtm/Bmba.git
git add -A && git commit -m "رسالة"
git push origin master
```

- `gh` CLI غير مثبّت؛ يمكنك إما تثبيته والتحقق بـ `gh auth login`،
  أو إنشاء Personal Access Token (صلاحية `repo`) واستخدامه مع git.
- الفرع الافتراضي: `master`.
- `.gitignore` يستثني: `.env*`, `*.db*`, `node_modules`, `.next`, `.vercel`, `*.log`.

---

## 🪙 نظام المكافئات (منفَّذ مؤخراً)

- **هدية الاشتراك:** 100 بمبا تُمنح عند أول تسجيل (في `app/api/auth/register/route.js`).
- **الأعضاء القدامى:** نالوا +100 تلقائياً عبر `lib/db.js` init (لمرة واحدة، محمي بمعرّف `welcome`).
- **صفحة المكافئات** `/rewards`: رصيد + أزرار:
  - 🎬 إعلانات: **لا تمنح بمبات** حالياً (لا توجد إعلانات) — رسالة فقط.
  - 📝 أسئلة: **64 سؤالاً عشوائياً لكل مشترك** (8 أسئلة لكل زيارة) → `/questions`.
  - 📤 مشاركة: تُمنح (+5) **فقط بعد مشاركة حقيقية** (navigator.share تنجح أو تُفتح نافذة المشاركة).
  - 👥 كود دعوة: عرض الكود + نسخ الرابط `?ref=CODE`؛ عند دخول صديق بالكود: الداعي +10 والمدعو +5.
  - 🔥 تحديات: رابط لمركز التحديات (`/challenges` → quiz/arena/champions/coach/store).

---

## 📌 ملاحظات أمان مهمة

1. دوّن قيم `TURSO_*` و `JWT_SECRET` في مكان آمن (وليس داخل هذا الملف).
2. إذا ظهر أي توكن GitHub في محادثة، قم بإبطاله من GitHub فوراً.
3. أي عمل جديد على الإنتاج بخصوص قاعدة البيانات (بذر/تعديل بيانات) يُفضل عبر
   سكربت مثل `backfill-welcome.js` أو من خلال واجهات `app/api/admin/*`.