'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const SEEN_KEY = 'bomba_notif_seen';
const MSG_KEY = 'bomba_chat_last_msg';
const POLL_MS = 60000;

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

  const requestPerm = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') {
      new Notification('تم تفعيل الإشعارات 🔔', { body: 'سنخبرك عند بداية المباريات وتوقعاتك الصحيحة', icon: '/icon-192.png' });
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
            {perm !== 'granted' && perm !== 'unsupported' && (
              <button className="bell-enable" onClick={requestPerm}>🔔 تفعيل</button>
            )}
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