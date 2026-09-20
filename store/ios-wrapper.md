# حزمة iOS الرسمية (Wrapper)

يُبنى إصدار آيفون/آيباد عبر Xcode بسحب التطبيق داخل **WKWebView** يعرض
`https://bmba-app.vercel.app/`. خطوات الإنشاء:

## 1) إنشاء مشروع Xcode

1. افتح Xcode (متوفر على جهاز macOS فقط).
2. `File → New → Project → iOS → App`، الاسم: **Bmba**.
3. اختر Interface: SwiftUI (أو Storyboard).

## 2) إضافة WKWebView

في `ContentView.swift`:

```swift
import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1)
        webView.load(URLRequest(url: url))
        return webView
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://bmba-app.vercel.app/")!)
            .ignoresSafeArea()
    }
}
```

## 3) الأيقونة واللقطات

- الأيقونة: استخدم `public/icon-1024.png` (نفسها تُرفع في App Store Connect).
- شاشة البداية: خلفية `#111827` مع شعار بومبا.

## 4) الرقم التعريفي (Bundle Identifier)

- اقتراح: `com.bmba.predictions`
- أنشئ App ID في Apple Developer ثم ركّب الهوية الموقعة.

## 5) الأرشيف والنشر

1. ربط حساب Apple Developer بتوقيع تلقائي.
2. `Product → Archive` ثم `Distribute App → App Store Connect`.
3. املأ بيانات القائمة في `store/apple-app-store-listing.md`.

> 💡 بدون ماك: يمكن الاعتماد على PWA «إضافة إلى الشاشة الرئيسية» أولًا،
> وألّا يُرفع إصدار iOS الأصلي إلا بعد جاهزية أجهزة واختبارات أبل المطلوبة.
> Google Play لا يتطلب حزمة أصلية لأن TWA (أندرويد) مدمج رسميًا في Android System WebView.