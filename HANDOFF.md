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
| `lib/questions.js` | مصرف 160 سؤالاً رياضياً + pickRandomQuestions (عشوائية لكل مشترك) |
| `lib/rewards.js` | claim / ensureInviteCode |
| `scripts/generate-icons.js` | إعادة توليد أيقونات PWA/المتاجر من `public/logo.png` |
| `android/twa-manifest.json` | إعدادات حزمة أندرويد (Bubblewrap/TWA) |
| `.github/workflows/android-apk.yml` | بناء AAB/APK تلقائياً على GitHub Actions |
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
  - 📝 أسئلة: **160 سؤالاً** على مستوى العالم (الدوريات الخمسة الكبرى + روشن + المونديال/اليورو) — 8 أسئلة عشوائية لكل زيارة، والتنويع حسب كل مشترك (لا يتكرر سؤال مُجاب) → `/questions`.
  - 📤 مشاركة: تُمنح (+5) **فقط بعد مشاركة حقيقية** (navigator.share تنجح أو تُفتح نافذة المشاركة).
  - 👥 كود دعوة: عرض الكود + نسخ الرابط `?ref=CODE`؛ عند دخول صديق بالكود: الداعي +10 والمدعو +5.
  - 🔥 تحديات: رابط لمركز التحديات (`/challenges` → quiz/arena/champions/coach/store).

---

## 🏆 سوق المدرب (Coach) — موسّع

- قاعدة لاعبي **234 لاعباً** من كل المراكز (GK/DEF/MID/FWD) عبر الدوريات الخمسة
  الكبرى (EPL/LIGA/ITA/GER/FRA) + دوري روشن السعودي (SAU) — ملف `lib/players-data.js`.
- البذر محمي بعلم `players_seed_v3` في `lib/db.js`؛ يُدرج اللاعبين الجدد (بالاسم+النادي)
  دون تكرار لقواعد البيانات القائمة (محلي + إنتاج).

## 🏆 تحدّي الأبطال (Champions) — موسّع

- الدوريات: EPL / LIGA / ITA / GER / FRA / SAU / UCL (محرّكة من `data.leagues` في `lib/champions.js`).
- قوائم أكبر للهداف وأفضل لاعب لكل دوري.

## 🎯 حلبة التوقعات (Arena) — مباريات حقيقية خاصة

- عند إنشاء الحلبة تُركّب مباريات حقيقية قادمة من API المباريات (حتى 20) في جدول `arena_matches`.
- هذه المباريات **خاصة بالحلبة فقط** — لا تُغذّي التوقعات العامة أبداً (لا كُتب إلى `predictions`).
- المالك لديه زر 🔄 تحديث المباريات (متاح داخل تفاصيل الحلبة للماستر فقط).
- منطق الربط في `lib/arena.js` (يطلب API فقط إذا كان عدد المباريات القادمة أقل من 10).

---

## 🔧 أيقونات PWA وتهيئة المتاجر (منفَّذ مؤخراً)

- **السبب الجذري:** كل أيقونات PWA كانت بحجم 2000×2000 رغم الإعلان عنها 192/512 →
  تثبيت المتصفح لا يجد حجمًا صحيحًا → شعار قديم/مفقود عند التثبيت وعلى النطاق القديم.
- **الحل:** `node scripts/generate-icons.js` يولّد من `public/logo.png` (هو الشعار الأصلي
  `BMBA_20241101_172651`) كل المقاسات الصحيحة:
  `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (خلفية صلبة)،
  `apple-touch-icon.png` (180)، `icon-1024.png` (المتاجر)، `favicon-16/32.png`,
  و`app/favicon.ico` متعدد الأحجام.
- **manifest.json:** أُضيفت أيقونة `maskable` وأبعاد صحيحة + `id` و`display_override`.
- **layout.js:** إشارة `favicon.ico` + `apple-touch-icon` + أيقونات صحيحة في metadata.
- **sw.js:** كاش أصبح `bomba-v3` (يُبطل مخزون الأيقونات القديمة تلقائياً —
  مهم للنطاق القديم).
- **حجم شعارات الفرق:** أصبح «متوسط» — `.mc-team .team-logo` 42px، `.mteam .team-logo`
  34px، `.md-logo` 46px، `.pm-logo` 42px.
- **الرفع للمتاجر:**
  - Google Play: `android/twa-manifest.json` + `.github/workflows/android-apk.yml`
    يبني AAB/APK عبر Bubblewrap → رفع الملفات في GitHub Actions.
  - App Store: خطوات حزمة iOS في `store/ios-wrapper.md`.
  - القوائم: `store/google-play-listing.md` + `store/apple-app-store-listing.md`.
  - البيانات والخصوصية: `store/privacy-and-data-safety.md`.
  - مواصفات المنتج: `PRD.md`.

> ⚠️ عند تغيير النطاق مستقبلاً: عدّل `android/twa-manifest.json` (host/start_url)
> ثم أعد تشغيل workflow البناء.

---

## 📧 المصادقة: تسجيل بالإيميل + ربط جوجل وفيسبوك (منفَّذ)

- **تسجيل بالإيميل:** محور البريد الإلكتروني في `components/RegisterForm.js` هو
  تبديل «📱 رقم الجوال / ✉️ البريد الإلكتروني» (`reg-method-tabs`). وضع الإيميل يُرسل
  `phone: null` و`email` فيطلب المسار في الانشئ `app/api/auth/register/route.js` فحص
  البريد ويولّد هاتفاً وهمياً (`u<timestamp><rand>`) لملء عمود `phone UNIQUE NOT NULL`.
- **دخول بالإيميل:** `app/api/auth/login/route.js` يبحث في `phone` و`email` و`name`
  معاً — بالتالي أدخل البريد أو الجوال مباشرة. حقول `ld_label`/`ld_ph` أصبحت
  «البريد الإلكتروني / رقم الجوال».
- **ربط جوجل وفيسبوك (جاهز للتفعيل):**
  - `lib/social-auth.js`: `buildAuthUrl`, `exchangeCode`, `findOrCreateSocialUser`
    (ربط حساب موجود بنفس البريد، أو إنشاء جديد + هدية 100 بمبا + كود دعوة).
  - مسارات OAuth كاملة: `app/api/auth/google/route.js` + `callback/route.js`،
    وكذلك `facebook/...`.
  - المستخدم الجديد: عمودا `google_id` و`facebook_id` في `users`
    (ترحيل تلقائي في `lib/db.js` + فهارس فريدة).
  - أزرار الواجهة (`components/LoginMethods.js`) تستدعي المسارات؛ إذا لم تُهيَّأ
    المفاتيح تظهر «قريباً 🔜» تلقائياً.
- **لتفعيل جوجل:** أنشئ مشروع OAuth في Google Cloud Console، أضف URI المعاد:
  `https://bmba-app.vercel.app/api/auth/google/callback`، ثم ضع في Vercel:
  `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET`.
- **لتفعيل فيسبوك:** أنشئ تطبيقاً في Meta for Developers، أضف:
  `https://bmba-app.vercel.app/api/auth/facebook/callback` كـ Valid OAuth Redirect،
  ثم ضع في Vercel: `FACEBOOK_APP_ID` و`FACEBOOK_APP_SECRET`.
- **بديل تخزين الإعدادات:** يمكن تخزين كل مفتاح كإعداد في جدول `settings`
  (`google_client_id`, `google_client_secret`, `facebook_app_id`,
  `facebook_app_secret`) بدلاً من متغيرات البيئة — يُقرأ تلقائياً.
- **رسائل الخطأ:** `callback/*/route.js` تُعيد تحويلاً إلى `/login?error=...`
  و`LoginMethods` يعرض رسالة عربية مناسبة.

---

## 📌 ملاحظات أمان مهمة

1. دوّن قيم `TURSO_*` و `JWT_SECRET` في مكان آمن (وليس داخل هذا الملف).
2. إذا ظهر أي توكن GitHub في محادثة، قم بإبطاله من GitHub فوراً.
3. أي عمل جديد على الإنتاج بخصوص قاعدة البيانات (بذر/تعديل بيانات) يُفضل عبر
   سكربت مثل `backfill-welcome.js` أو من خلال واجهات `app/api/admin/*`.