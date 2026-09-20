# بومبا لتوقعات (Bmba Predictions) ⚽🏆

تطبيق ويب (PWA) باللغة العربية لتوقّع نتائج مباريات كرة القدم، مع مكافآت وتحديات ودردشة.

**الموقع الحي:** https://bmba-app.vercel.app

## المزايا

- توقّع نتائج المباريات من الدوريات الخمس الكبرى + دوري روشن السعودي (نتائج مباشرة).
- نظام مكافآت: نقاط لكل توقع صحيح + هدية ترحيبية 100 نقطة + متجر مكافآت.
- تحديات: **تحدّي الأبطال** (خماسية الدوريات الكبرى + روشن + دوري الأبطال)،
  **بطولة المدرب** (234+ لاعبًا عالميًا من كل المراكز)،
  **حلبة التوقعات** (مباريات خاصة لكل حلبة)،
  **جاوب واكسب** (160+ سؤالًا متنوعًا بين المستخدمين).
- دردشة عامة، لوحة قادة، ملف شخصي، سياسة سرية وشروط.

## التقنيات

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- قاعدة بيانات [Turso](https://turso.tech) (libSQL)
- PWA: Manifest + Service Worker + تثبيت (Add to Home Screen)
- نشر على Vercel

## التشغيل محليًا

```bash
npm install
npm run dev   # http://localhost:3000
```

## الأيقونات والشعارات

شعار المشروع الأصلي هو `public/logo.png` (ينسخ منه جميع الأيقونات).

لإعادة توليد الأيقونات بأحجام جديدة (بعد تغيير الشعار):

```bash
node scripts/generate-icons.js
```

الملفات الناتجة:

| الملف | الاستخدام |
|---|---|
| `icon-192.png` / `icon-512.png` | أيقونات PWA (تثبيت المتصفح) |
| `icon-512-maskable.png` | أيقونة «مانحة» آمنة القص (Android) |
| `apple-touch-icon.png` | أيقونة iOS (180×180) |
| `favicon.ico` | فافيكون التبويبات (في `app/`) |
| `icon-1024.png` | أيقونة المتاجر (Google Play / App Store) |

## الإطلاق في المتاجر

- **Google Play (TWA/APK):** انظر [`android/README.md`](android/README.md)
  و`android/twa-manifest.json` وملف `.github/workflows/android-apk.yml`.
- **Apple App Store:** انظر [`store/ios-wrapper.md`](store/ios-wrapper.md).
- **قوائم المتاجر:** [`store/google-play-listing.md`](store/google-play-listing.md)
  و[`store/apple-app-store-listing.md`](store/apple-app-store-listing.md).
- **مواصفات المنتج:** [`PRD.md`](PRD.md).

## سياسة الخصوصية

- صفحة في التطبيق: `/privacy` (نصوص من `lib/i18n.js`).
- نسخة المتاجر: `store/privacy-and-data-safety.md`.

## الأوامر

```bash
npm run dev      # تطوير
npm run build    # بناء الإنتاج
npm run start    # تشغيل الإنتاج محليًا
```

---

التوثيق الكامل لجلسات العمل ومفاتيح الإدارة المرجعية في [`HANDOFF.md`](HANDOFF.md).