'use client';
import { useEffect, useState } from 'react';

const SEEN_KEY = 'bomba_install_seen';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [guide, setGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      window.location.search.includes('source=pwa');
    setInstalled(isStandalone);
    if (isStandalone) return;

    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShow(false);
      setGuide(false);
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch {}
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);

    try {
      if (sessionStorage.getItem(SEEN_KEY) !== '1') {
        setShow(true);
        sessionStorage.setItem(SEEN_KEY, '1');
      }
    } catch {
      setShow(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const doInstall = async () => {
    if (deferred && deferred.prompt) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setShow(false);
        setGuide(false);
      } else {
        setGuide(true);
      }
      setDeferred(null);
      return;
    }
    setGuide(true);
  };

  const close = () => setShow(false);

  if (guide) {
    const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    return (
      <div className="install-guide-overlay" dir="rtl" onClick={() => setGuide(false)}>
        <div className="install-guide" onClick={(e) => e.stopPropagation()}>
          <button className="install-close" onClick={() => setGuide(false)} style={{position: 'absolute', top: 8, left: 12}}>✕</button>
          <h3 style={{marginBottom: 10}}>📍 كيف أثبّت التطبيق؟</h3>
          <div className="install-steps">
            <div className="install-step"><span>1</span> افتح الموقع في متصفح Chrome أو Safari</div>
            {isIOS ? (
              <>
                <div className="install-step"><span>2</span> اضغط زر المشاركة <b>⬆️</b> أسفل الشاشة</div>
                <div className="install-step"><span>3</span> اختر <b>«إضافة إلى الشاشة الرئيسية»</b></div>
                <div className="install-step"><span>4</span> اضغط <b>«إضافة»</b> وسيظهر التطبيق على شاشتك</div>
              </>
            ) : (
              <>
                <div className="install-step"><span>2</span> اضغط النقاط الثلاثة <b>⋮</b> في أعلى المتصفح</div>
                <div className="install-step"><span>3</span> اختر <b>«تثبيت التطبيق»</b> أو «إضافة إلى الشاشة الرئيسية»</div>
                <div className="install-step"><span>4</span> اضغط <b>«تثبيت»</b> وسيظهر التطبيق على شاشتك</div>
              </>
            )}
          </div>
          <button className="btn-sm btn-success" onClick={() => setGuide(false)} style={{width: '100%', marginTop: 14}}>تمام، فهمت</button>
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="install-banner" dir="rtl">
      <div className="install-info">
        <div className="install-title">ثبّت تطبيق بومبا 📲</div>
        {deferred && deferred.prompt ? (
          <div className="install-sub">افتح بسرعة مثل أي تطبيق من شاشتك</div>
        ) : (
          <div className="install-sub">متاح على أي جوال — أندرويد وآيفون</div>
        )}
      </div>
      <button className="btn-sm btn-success" onClick={doInstall}>
        {deferred && deferred.prompt ? 'تثبيت' : 'كيف أثبّت؟'}
      </button>
      <button className="install-close" onClick={close}>✕</button>
    </div>
  );
}