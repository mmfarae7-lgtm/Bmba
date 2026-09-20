# بناء تطبيق Android (APK/AAB) عبر حزمة TWA

تُبنى نسخة أندرويد الرسمية من «بومبا لتوقعات» باستخدام **Trusted Web Activity (TWA)** عبر أداة
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) الرسمية من Google.

## سبب توقف الـ APK السابق

كان الـ APK السابق مبنيًا على:
1. أيقونات بحجم خاطئ في المانيفست (كلها 2000×2000 رغم إعلانها 192/512) → لا تظهر أيقونة صحيحة.
2. كاش قديم في Service Worker يبقى على النطاق القديم (`bomba-v2`) ولا يُمسح → يظهر الشعار القديم.
3. نطاق قديم لا يخدم `twa-manifest` بالشكل المطلوب.

## الإصلاحات المطبقة

- توليد أيقونات بأحجام صحيحة: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `icon-1024.png`, `favicon.ico` من شعار المشروع الأصلي `logo.png` (سكربت: `scripts/generate-icons.js`).
- تحديث `public/manifest.json` بالأيقونة المانحة (maskable) وأبعاد صحيحة.
- رفع إصدار كاش الـ Service Worker إلى `bomba-v3` لمسح أيقونات النطاق القديم عند أول زيارة.

## البناء محليًا (الطريقة الرسمية)

المتطلبات: Node.js 18+، وJava JDK 11+، وAndroid SDK (أو Android Studio).

```bash
# 1) تسجيل الدخول لمخزن المفاتيح (اختياري للتعميم)
npm install -g @bubblewrap/cli

# 2) توليد مشروع أندرويد من المانيفست
bubblewrap init --manifest ./android/twa-manifest.json

# 3) بناء الحزمة (bundle = AAB للمتجر / apk للتثبيت المباشر)
bubblewrap build
```

النتيجة:
- `app-release-bundle.aab` ← تُرفع إلى Play Console.
- أو `app-release-signed.apk` ← توزيع مباشر للمستخدمين.

> ملاحظة: عند تغيير النطاق في المستقبل، عدّل `host` و`start_url` في
> `android/twa-manifest.json` ثم أعد البناء.

## البناء تلقائيًا على GitHub Actions

أضيف إلى المستودع ملف:
`.github/workflows/android-apk.yml`

عند الدفع لفرع `master` (أو يدويًا من تبويب Actions) تُبنى حزمة AAB و APK ويرفعان مرفقات (Artifacts):
- راجع: `.github/workflows/android-apk.yml`
- اتبع خطوات **GitHub Actions → android-apk → Run workflow**.

## رفع AAB إلى Google Play

1. سجّل (أو ادخل) على [Play Console](https://play.google.com/console).
2. أنشئ تطبيقًا جديدًا بهوية التطبيق المذكورة في `store/google-play-listing.md`.
3. في **Release → Production** ارفع `app-release-bundle.aab`.
4. أجب عن استبيان الأمان والأذونات (بيانات المستخدم: الاسم/الجوال/الدولة وتُحذف عند الطلب).
5. انشر.

## أيقونة/شاشة البداية

الأيقونة المسجّلة في `twa-manifest.json` تُأخذ من `icon-512-maskable.png` وتُحوَّل تلقائيًا لجميع المقاسات عند البناء لأول مرة. بعد أول بناء، تُخفَّض مرجعيًا في
`android/` تحت `res/mipmap-*` — استبدلها بشعار بومبا إن رغبت بتخصيص أصدق.