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

## 📱 التحقق برمز SMS / واتساب (OTP) — منفَّذ

- **التدفق:** التسجيل بالجوال الآن يتطلب تحقق «الرمز» أولاً، والدخول يدعم رمزاً بديلاً
  عن كلمة المرور:
  1. `POST /api/auth/send-otp` — يولّد رمزاً (6 أرقام) صالحاً **10 دقائق** ويحفظه في جدول `otps`
     (رقم واحد الاستخدام، 5 محاولات كحد أقصى، مهلة دقيقة بين إعادة الإرسال) ثم يرسله.
  2. `POST /api/auth/verify-otp` — يتحقق من الرمز ويُصدر توكن `JWT` قصيراً (15 دقيقة)
     مربوطاً بالرقم والغرض (`register` أو `login`).
  3. التسجيل: `app/api/auth/register/route.js` يتطلب `otp_token` صالحاً عند التسجيل بالجوال
     (الإيميل كما هو).
  4. الدخول: `app/api/auth/login/route.js` يقبل `otp_token` + `phone` + `phone_code` للدخول بالرمز.
- **الواجهة:** `components/RegisterForm.js` (تبويب الجوال: أرسل الرمز ← أدخل الرمز ← تم التحقق)
  + `components/LoginMethods.js` (زر «📲 الدخول برمز الجوال (SMS/واتساب)»).
- **الإرسال الحقيقي (Twilio):** عند توفر المفاتيح التالية في Vercel يُرسل فعلياً عبر
  Twilio Messages API (إما SMS أو واتساب حسب `SMS_CHANNEL`):
  - `TWILIO_ACCOUNT_SID` و`TWILIO_AUTH_TOKEN` (من console.twilio.com).
  - `TWILIO_FROM_PHONE` (رقم Twilio بصيغة `+1...` لـ SMS).
  - `TWILIO_WHATSAPP_FROM` (اختياري — مرسل واتساب `whatsapp:+1415...`).
  - `SMS_CHANNEL` = `sms` أو `whatsapp` (افتراضي `auto`: واتساب فقط إذا توفر مرسله).
- **وضع تجريبي (بدون مفتاح):** يعمل الآن مباشرة — يُعيد `devCode` في استجابة
  `send-otp` وتظهر الواجهة «وضع تجريبي: الرمز هو 123456» حتى يمكن اختبار كل التدفقات.
  جرّب: `post /api/auth/send-otp {phone,phone_code} → devCode → verify-otp → register/login`.
- **ملف المنطق:** `lib/otp.js` (توليد/تخزين/تحقق + إرسال Twilio بـ `fetch`) — جدول `otps`
  يُنشأ تلقائياً في `lib/db.js`.

---

---

## 🔔 إشعارات الجوال (Web Push — تصل حتى مع إغلاق التطبيق)

طلب المستخدم: الإشعارات تعمل من الجوال مع طلب إذن، وليس فقط داخل التطبيق.

- **الاشتراك:** زر «🔔 تفعيل» في الجرس يطلب الإذن من المتصفح/الجوال، ثم يقرأ مفتاح
  VAPID العام من `get /api/notifications/vapid-key` ويشترك عبر `PushManager.subscribe`
  ويحفظ اشتراكه في `post /api/notifications/subscribe` (جدول `push_subscriptions`).
- **الاستقبال حتى مع الإغلاق:** `public/sw.js` يعالج `push` (عرض إشعار) و
  `notificationclick` (فتح الرابط عند ضغط الإشعار).
- **إرسال فعلي** يتم بـ `web-push` (أُضيف إلى dependencies) في `lib/push.js`:
  - `sendPushToUser(userId, title, body, url)` لإشعار مستخدم بعينه.
  - `sendPushToAll(title, body, url)` للبث الجماعي.
  - حذف تلقائي للاشتراكات المنتهية (410/404).
- **مفاتيح VAPID:** تُولَّد تلقائياً وتُحفظ في جدول `settings` (`vapid_public`/
  `vapid_private`) — لا حاجة لأي متغير بيئة. (اختياري للتجاوز:
  `VAPID_PUBLIC_KEY` و`VAPID_PRIVATE_KEY`.)
- **نقاط التشغيل الحقيقية:**
  - مستخدم: عند «توقع صحيح» تُحسب النقاط في `lib/points.js` ويُرسل إشعار
    «🎯 توقع صحيح!» فوراً للمستخدم (حتى لو التطبيق مغلق).
  - مستخدم: زر «📤 جرّب» في لوحة الجرس يرسل إشعار تجربة لنفسه
    (`post /api/notifications/test`).
  - مشرف: `post /api/notifications/broadcast` (يتطلب admin) يبث للجميع.
- **أمان:** كل مسارات الإشعارات تتطلب تسجيل دخول إلا `vapid-key` (المفتاح العام
  علني بطبيعته). لا تُكشف مفاتيح VAPID الخاصة خارج الخادم.
- **ملاحظة iOS:** إشعارات الويب تعمل على iPhone عبر Safari 16.4+ بعد تثبيت
  التطبيق على الشاشة الرئيسية (PWA). على Android Chrome تعمل مباشرة.

## 🛍️ متجر بمبا — الشركاء والمنتجات والقسائم (منفَّذ)

طلب المستخدم: متجر يحتوي ملابس وأدوات رياضية تعرضها محلات الرياضة الشريكة،
وإظهار أسماء المحلات/المطاعم/المتاجر بعد التنسيق معهم، بحيث يستبدل المستخدم
بمباته بقسيمة شراء من المحل الذي يختاره أو قسيمة خصم تصل إلى 20%/50%/70%.

- **الصفحة:** `app/store/page.js` — `/store` بتبويبات:
  - 👕 المنتجات: كتالوج منتجات محلات الرياضة (اسم، ماركة، سعر بالريال، شارة خصم اختيارية).
  - 🏬 الشركاء: بطاقات المحلات/المطاعم/المتاجر (نوع، تصنيف، موقع، شعار).
  - 🎟️ القسائم والخصومات: استبدال بمبات بقسيمة (خصم حتى 70% أو عنصر/وجبة).
  - 📦 قسائمي: قسائم المستخدم مع كود `BMBA-XXXXXXXX` يُعرض عند المحل.
- **الجداول** في `lib/db.js`: `store_merchants`، `store_products`،
  `store_vouchers`، `user_vouchers` (كود فريد لكل قسيمة مشتراة).
- **المنطق:** `lib/bomba-store.js` — الكتالوج، قسائم المستخدم، الاستبدال
  (خصم بمبات + توليد كود)، وإضافة الشركاء/المنتجات/القسائم.
- **مسارات API:**
  - `get /api/bomba-store` — الكتالوج (يعمل بلا تسجيل؛ مع تسجيل يضيف الرصيد وقسائمي).
  - `post /api/bomba-store/redeem` — استبدال بمبات بقسيمة (يتطلب تسجيل دخول).
  - `get/post/delete /api/admin/bomba-store` — إدارة الشركاء والمنتجات والقسائم
    (يتطلب admin) + `؟entity=merchant|product|voucher&id=` للحذف.
- **لوحة المشرف:** تبويب «🛍️ متجر بمبا» في `app/admin/page.js` (مكوّن
  `BombaStoreAdmin`): إضافة/حذف شركاء ومنتجات وقيسمات + سجل الاستبدالات.
- **التنقل:** رابط «🛍️ متجر بمبا» في قائمة TopBar (`menu_store` في `lib/i18n.js`).
- **الدمج (مؤخراً):** المتجر القديم `/challenges/store` (جوائز داخل التطبيق) دُمج
  داخل `/store` بتبويب «🎁 الجوائز» (يبقى `/api/store` و`/api/store/buy` للشراء)،
  وأُضيف redirect دائم من `/challenges/store` → `/store` في `next.config.mjs`،
  وبطاقة المتجر في `/challenges` تشير الآن إلى `/store`.
- **البذر:** أول تشغيل يملأ 6 شركاء و6 منتجات و6 قسائم (مفتاح
  `bomba_store_seed_v1` في `settings`).
- **اختبار E2E محلي:** 18 فحصاً (كتالوج عام، رصيد غير كافٍ، استبدال ناجح،
  كود BMBA، قسائمي، 401 بلا توكن) + 11 فحصاً إدارياً (إضافة/حذف شريك ومنتج
  وقيسمة وظهورها في الكتالوج) — كلها نجحت قبل الرفع.

## 📋 قائمة الملف الشخصي في الشريط العلوي — Bottom Sheet على الجوال (منفَّذ)

طلب المستخدم: على الجوال تتحول قائمة الملف الشخصي (المفتوحة من صورة المستخدم في
TopBar) إلى Mobile Bottom Sheet أنيق بدلاً من القائمة العمودية الطويلة، مع إبقاء
الـ Dropdown الحالي على التابلت/الديستوب.

- **المكوّن:** `components/TopBar.js` — القائمة نفسها (نفس العناصر) مع إعادة
  هيكلتها لأقسام وعناوين: Header (الصورة/الاسم/النقاط/البمبات) + فاصل، ثم 4 أقسام:
  الحساب / التفضيلات / التطبيق / بيانات الاستخدام. كل عنصر: أيقونة + اسم + مساحة ضغط
  مريحة (≥54px) + تأثير `:active`.
- **البنية (إصلاح جذري):** backdrop والشريط خرجتا من `.topbar-actions` (الذي كان
  يستخدم `transform: translateY(-50%)` فجعل الـ fixed نسبياً له بدلاً من الشاشة)
  إلى مستوى `<nav className="topbar">` — على الديسكتوب موضع `absolute; top:44px;
  right:10px` بعرض 240px.
- **التجاوب في `app/globals.css`:** Media Query `max-width: 480px` يحوّل القائمة إلى
  Bottom Sheet مثبّت أسفل الشاشة (زوايا علوية دائرية، `max-height: 82dvh`، تمرير
  داخلي `.dd-body`، حركة ظهور `dd-sheet-up`، `z-index: 500`، ورفع `.topbar` إلى
  600 عند الفتح).
- **وظائف الأقسام دون تغيير:** الملف الشخصي، الإعدادات، المتجر، اللغة، الوضع
  فاتح/داكن (ThemeToggle)، معلومات المسابقة، تابعنا، مشاركة التطبيق، الخصوصية،
  الشروط، الأسئلة الشائعة، تسجيل الخروج.
- **الإغلاق:** زر ✕ + الضغط على الـ backdrop + السحب للأسفل
  (`onTouchStart/Move/End` مع `dragY` وحدة قفل السحب). قفل تمرير الصفحة خلف
  الـ sheet على الجوال فقط (`body.bomba-menu-open` + `overflow:hidden`).
- **🚫 إزالة الجرس 🔔 من الشريط العلوي نهائياً** (قرار المستخدم: الإشعارات موجودة
  أسفل الصفحة عبر `components/Notifications.js` في `app/layout.js`).
- **مفاتيح i18n:** `dd_sec_account` / `dd_sec_prefs` / `dd_sec_app` / `dd_close`
  في `lib/i18n.js` (عربي + إنجليزي).
- **اختبار E2E محلي (Chrome headless + CDP):** 320×568 (صغير) و390×844 (متوسط)
  و1280×800 (ديستوب) — Bottom Sheet ملاصق للأسفل بدون overflow أفقي، القفل يعمل،
  Header بـ 1,250 نقاط/320 بمبات، 12 عنصراً و4 أقسام، وارتفاع كل عنصر ≥54px،
  الإغلاق بالزر/الخارج/السحب يعمل — الكل نجح قبل الرفع.

## 📷 رفع صور المنتجات في المتجر — منفَّذ

طلب المستخدم: لا يريد الصور الرمزية الافتراضية (👕) للمنتجات + يريد خيار رفع صور
حقيقية لكل منتج.

- **أين تُضاف المنتجات؟** لوحة الأدمن `/admin` → تبويب «🛍️ متجر بمبا» → «👕 المنتجات»
  (نموذج «➕ إضافة منتج»: الشريك/الاسم/الماركة/السعر بالريال/الصورة/الوصف/شارة الخصم).
- **رفع الصور:** زر «📷 رفع صورة المنتج» في نموذج المنتج — يختار صورة من الجهاز، وتُضغط
  تلقائياً في المتصفح (`compressImage` في `app/admin/page.js`؛ تحجيم أقصى 720px وجودة
  82% عبر canvas + `createImageBitmap` لمعالجة دوران EXIF، مع مسار احتياطي) وتُعرض
  معاينة فورية قبل الحفظ.
- **التخزين:** الصورة تُحفظ كـ Data URL (base64 JPEG/WebP ~4.5KB لصورة 240px، وحتى
  ~150KB لصورة هاتف) داخل حقل `store_products.image` — يعمل محلياً (SQLite) **وعلى
  Vercel/Turso** بلا أي استضافة ملفات خارجية (ملفات `public/uploads` لا تبقى على Vercel).
- **التعديل:** زر «✏️ تعديل» لكل منتج في الجدول يفتح نفس النموذج بوضع تعديل (PUT):
  تغيير الصورة أو أي بيانات — لاستبدال صور المنتجات الستة الافتراضية دون حذفها.
  مسار `PUT /api/admin/bomba-store?entity=product&id=`.
- **العرض:** صفحة `/store` تعرض `<img class="sp-img">` داخل إطار بنسبة 1:1
  (`object-fit: cover`) عندما تكون الصورة رابطاً/Data URL، وتعود للرمز التعبيري فقط
  إذا لم يُرفع شيء (fallback «👕»).
- **أنماط CSS:** `.upload-btn` و`.upload-preview` و`.adm-img` (جدول الأدمن)
  و`.sp-img-wrap`/`.sp-img` في `app/globals.css`.
- **اختبار E2E محلي:** دخول الأدمن ← رفع صورة canvas حقيقية عبر PUT ← ظهورها في
  `/store` كصورة فعلية ← نموذج الأدمن (زر الرفع، 6 أزرار تعديل، معاينة) ← وضع التعديل
  بالمعاينة ← التراجع للصورة الأصلية — كل الفحوصات نجحت قبل الرفع.
- ملاحظة: شعارات «الشركاء» (🏬) ما زالت رموزاً تعبيرية — يمكن لاحقاً إضافة رفع
  مماثل لها بنفس الطريقة إن رغبت.

## 📌 ملاحظات أمان مهمة

1. دوّن قيم `TURSO_*` و `JWT_SECRET` في مكان آمن (وليس داخل هذا الملف).
2. إذا ظهر أي توكن GitHub في محادثة، قم بإبطاله من GitHub فوراً.
3. أي عمل جديد على الإنتاج بخصوص قاعدة البيانات (بذر/تعديل بيانات) يُفضل عبر
   سكربت مثل `backfill-welcome.js` أو من خلال واجهات `app/api/admin/*`.