'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const SEEN_KEY = 'bomba_notif_seen';
const MSG_KEY = 'bomba_chat_last_msg';
const POLL_MS = 60000;


// تحويل مفتاح VAPID (Base64URL) إلى Uint8Array لاشتراك Web Push
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeen(set) {
  try {
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [perm, setPerm] = useState('default');
  const seenRef = useRef(loadSeen());
  const router = useRouter();

  const bumpUnread = useCallback((n) => setUnread((u) => u + n), []);

  const notifyBrowser = useCallback(async (evt) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(evt.title, { body: evt.body, icon: '/icon-192.png', badge: '/icon-192.png' });
      } catch {}
    } else if (Notification.permission === 'default' && evt.type !== 'chat') {
      try {
        const p = await Notification.requestPermission();
        if (p === 'granted') {
          new Notification(evt.title, { body: evt.body, icon: '/icon-192.png' });
        }
      } catch {}
    }
  }, []);

  const addItems = useCallback((fresh) => {
    if (fresh.length === 0) return;
    setItems((prev) => [...fresh, ...prev].slice(0, 30));
    bumpUnread(fresh.length);
    fresh.forEach(notifyBrowser);
  }, [bumpUnread, notifyBrowser]);

  const poll = useCallback(async () => {
    if (!user) return;
    let afterMsgId = '0';
    try {
      afterMsgId = localStorage.getItem(MSG_KEY) || '0';
    } catch {}
    try {
      const res = await fetch(`/api/notifications?afterMsgId=${afterMsgId}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.events)) return;
      const fresh = [];
      for (const e of data.events) {
        if (seenRef.current.has(e.id)) continue;
        seenRef.current.add(e.id);
        fresh.push(e);
      }
      if (fresh.length > 0) {
        saveSeen(seenRef.current);
        addItems(fresh);
      }
    } catch {}
  }, [user, addItems]);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      if (!d.user) return;
      setUser(d.user);
      setPerm('Notification' in window ? Notification.permission : 'unsupported');
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    const onVisible = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, poll]);

// اشتراك Web Push (إشعارات تصل حتى مع إغلاق التطبيق)
  const subscribeWebPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyRes = await fetch('/api/notifications/vapid-key');
        const keyData = await keyRes.json();
        if (!keyRes.ok || !keyData.publicKey) return false;
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });
      }
      if (sub) {
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
        return true;
      }
    } catch {}
    return false;
  };

  const requestPerm = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') {
      new Notification('تم تفعيل الإشعارات 🔔', { body: 'سنخبرك عند بداية المباريات وتوقعاتك الصحيحة', icon: '/icon-192.png' });
      await subscribeWebPush();
    }
  };

  const testPush = async () => {
    try {
      await subscribeWebPush();
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        new Notification('تعذّر الإرسال', { body: data.error || 'حاول مجدداً', icon: '/icon-192.png' });
      } else if (data.sent === 0) {
        new Notification('لا يوجد جهاز مشترك', { body: 'فعّل الإشعارات أولاً ثم جرّب', icon: '/icon-192.png' });
      }
    } catch {
      new Notification('تعذّر الإرسال', { body: 'حاول مجدداً', icon: '/icon-192.png' });
    }
  };

  const markRead = () => {
    setUnread(0);
    setItems((prev) => prev); // keep list
  };

  const goto = (link) => {
    setOpen(false);
    markRead();
    router.push(link);
  };

  if (!user) return null;

  const iconClass = unread > 0 ? 'bell-btn bell-btn-hot' : 'bell-btn';

  return (
    <>
      <button className={iconClass} onClick={() => { setOpen(!open); if (open) markRead(); }} aria-label="الإشعارات">
        🔔
        {unread > 0 && <span className="bell-badge">{unread}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-panel-head">
            <span>الإشعارات</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {perm === 'granted' && (
                <button className="bell-enable" onClick={testPush}>📤 جرّب</button>
              )}
              {perm !== 'granted' && perm !== 'unsupported' && (
                <button className="bell-enable" onClick={requestPerm}>🔔 تفعيل</button>
              )}
            </span>
          </div>
          <div className="bell-panel-body">
            {items.length === 0 ? (
              <div className="bell-empty">
                <div>🔕</div>
                <p>لا توجد إشعارات جديدة</p>
                <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                  سيظهر هنا: بداية المباريات، توقعاتك الصحيحة، مباريات لم تتوقعها، ورسائل الدردشة
                </p>
              </div>
            ) : (
              items.map((it, i) => (
                <button key={`${it.id}-${i}`} className={`bell-item bell-${it.type}`} onClick={() => goto(it.link)}>
                  <div className="bell-item-title">{it.title}</div>
                  <div className="bell-item-body">{it.body}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}