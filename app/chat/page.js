'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useI18n } from '../../lib/i18n';

export default function Chat() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [room, setRoom] = useState('general');
  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState([]);
  const messagesEndRef = useRef(null);
  const router = useRouter();

  async function fetchMessages() {
    const res = await fetch(`/api/chat?room=${room}`);
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages || []);
      if (data.messages && data.messages.length > 0) {
        const maxId = Math.max(...data.messages.map(m => m.id));
        try { localStorage.setItem('bomba_chat_last_msg', String(maxId)); } catch {}
      }
    }
    setLoading(false);
  };

  async function fetchUsers() {
    const res = await fetch('/api/leaderboard?period=all');
    const data = await res.json();
    setUserList(data.leaderboard || []);
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user);
      if (!d.user) router.push('/login');
    });
    fetchMessages();
    fetchUsers();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [room]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input, room })
    });
    if (res.ok) {
      setInput('');
      fetchMessages();
    }
  };

  const formatTime = (ts) => {
    const clean = (ts || '').includes('T') ? ts : (ts || '').replace(' ', 'T') + 'Z';
    const d = new Date(clean);
    const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
    return d.toLocaleTimeString(lang === 'en' ? 'en' : 'ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const rooms = [
    { name: 'general', label: t('chat_general') },
    { name: 'analysis', label: t('chat_analysis') },
    { name: 'casual', label: t('chat_casual') },
  ];

  return (
    <>
      <Navbar user={user} />
      <div className="main-container">
        <div className="chat-container">
          <div className="chat-header">
            <h2>
              <span className="online-dot"></span>
              {rooms.find(r => r.name === room)?.label || room}
            </h2>
            <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>
              {userList.length} {t('chat_viewers')}
            </span>
          </div>

          <div className="chat-rooms">
            {rooms.map(r => (
              <button key={r.name} className={room === r.name ? 'active' : ''} onClick={() => {setRoom(r.name); setLoading(true);}}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="chat-messages">
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div className="icon">💬</div>
                <p>{t('chat_empty')}</p>
              </div>
            ) : (
              messages.map(m => (
                <div className="chat-message" key={m.id}>
                  <div className={`chat-avatar ${m.user_role !== 'user' ? 'admin' : ''}`}>
                    {m.user_name?.charAt(0) || '؟'}
                  </div>
                  <div className="chat-bubble">
                    <div className={`msg-name ${m.user_role !== 'user' ? 'admin' : ''}`}>
                      {m.user_name}
                      {m.user_role === 'superadmin' && <span className="badge badge-superadmin" style={{marginRight: 6}}>{t('chat_admin')}</span>}
                      {m.user_role === 'admin' && <span className="badge badge-admin" style={{marginRight: 6}}>{t('chat_mod')}</span>}
                    </div>
                    <div className="msg-text">{m.content}</div>
                    <div className="msg-time">{formatTime(m.created_at)}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={t('chat_placeholder')}
              maxLength="500"
            />
            <button onClick={sendMessage}>{t('chat_send')} <span style={{fontSize: '0.8rem'}}>📨</span></button>
          </div>
        </div>
      </div>

      <MobileNav user={user} />
    </>
  );
}

function Navbar({ user }) {
  return <TopBar user={user} />;
}

function MobileNav({ user }) {
  return <BottomNav />;
}