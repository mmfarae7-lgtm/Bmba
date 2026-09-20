import "./globals.css";
import Script from "next/script";
import InstallPrompt from "../components/InstallPrompt";
import Notifications from "../components/Notifications";
import { I18nProvider } from "../lib/i18n";

export const metadata = {
  title: "بومبا لتوقعات | توقع نتائج المباريات",
  description: "وقع على نتائج المباريات وتنافس مع الأصدقاء - بومبا لتوقعات",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "بومبا",
  },
  formatDetection: { telephone: false },
  applicationName: "بومبا لتوقعات",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-512-maskable.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#111827",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('bomba-theme')||'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`}
        </Script>
        <Script id="lang-init" strategy="beforeInteractive">
          {`(function(){try{var l=localStorage.getItem('bomba-lang');if(l==='en'){document.documentElement.dir='ltr';document.documentElement.lang='en';}}catch(e){}})();`}
        </Script>
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator && window.location.protocol !== 'file:'){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`}
        </Script>
      </head>
      <body><I18nProvider>{children}</I18nProvider><InstallPrompt /><Notifications /></body>
    </html>
  );
}