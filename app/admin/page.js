'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [pointLogs, setPointLogs] = useState([]);
  const [liveStatus, setLiveStatus] = useState(null);
  const [liveKey, setLiveKey] = useState('');
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [knownLeagues, setKnownLeagues] = useState([]);
  const [shownIds, setShownIds] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState('users');
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsModal, setPointsModal] = useState(false);
  const [pointsValue, setPointsValue] = useState('');
  const [pointsReason, setPointsReason] = useState('');

  const [matchModal, setMatchModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchForm, setMatchForm] = useState({});
  const [adminDate, setAdminDate] = useState(() => todayStr());

  async function fetchUsers() {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  };

  async function fetchMatches() {
    const res2 = await fetch(`/api/matches?date=${adminDate}`);
    if (res2.ok) {
      const data = await res2.json();
      setMatches(data.matches || []);
    }
  };

  async function fetchLeagues() {
    const res = await fetch('/api/admin/leagues');
    if (res.ok) {
      const data = await res.json();
      setLeagues(data.leagues || []);
    }
  };

  async function fetchPointLogs() {
    const res = await fetch('/api/admin/points');
    if (res.ok) {
      const data = await res.json();
      setPointLogs(data.logs || []);
    }
  };

  async function fetchLiveStatus() {
    const res = await fetch('/api/admin/live');
    if (res.ok) {
      const data = await res.json();
      const s = data.status || {};
      setLiveStatus(s);
      setLiveEnabled(s.enabled);
      setKnownLeagues(data.knownLeagues || []);
      setShowAll(!!data.show_all);
      setShownIds(data.shown_ids && Array.isArray(data.shown_ids) ? data.shown_ids : []);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async d => {
      if (!d.user) {
        router.push('/login');
        return;
      }
      setUser(d.user);
      if (d.user.role !== 'admin' && d.user.role !== 'superadmin') {
        router.push('/');
        return;
      }
      setApproved(true);
      await Promise.all([fetchUsers(), fetchMatches(), fetchLeagues(), fetchPointLogs(), fetchLiveStatus()]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!approved) return;
    fetchMatches();
  }, [adminDate]);

  const handleBlock = async (targetId, blocked) => {
    if (blocked && !window.confirm('تأكيد حظر الحساب؟')) return;
    setUsers(prev => prev.map(x => x.id === targetId ? { ...x, blocked: blocked ? 1 : 0 } : x));
    try {
      const res = await fetch('/api/admin/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetId, blocked })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message);
      } else {
        showError(data.error || 'فشل تنفيذ العملية');
        setUsers(prev => prev.map(x => x.id === targetId ? { ...x, blocked: blocked ? 0 : 1 } : x));
      }
    } catch (e) {
      showError('خطأ في الاتصال بالخادم');
      setUsers(prev => prev.map(x => x.id === targetId ? { ...x, blocked: blocked ? 0 : 1 } : x));
    } finally {
      fetchUsers();
    }
  };

  const handleRole = async (targetId, role) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: targetId, role })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchUsers();
    } else {
      showError(data.error);
    }
  };

  const handleRename = async (u) => {
    const newName = window.prompt(`تعديل اسم: ${u.name}`, u.name);
    if (newName === null) return;
    const clean = newName.trim();
    if (!clean) {
      showError('الاسم لا يمكن أن يكون فارغاً');
      return;
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, name: clean })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchUsers();
      if (user && u.id === user.id) {
        setUser({ ...user, name: clean });
      }
    } else {
      showError(data.error);
    }
  };

  const handlePoints = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser.id, points: parseInt(pointsValue), reason: pointsReason })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      setPointsModal(false);
      setPointsValue('');
      setPointsReason('');
      fetchUsers();
      fetchPointLogs();
    } else {
      showError(data.error);
    }
  };

  const handleSaveMatch = async (e) => {
    e.preventDefault();
    const method = editingMatch ? 'PUT' : 'POST';
    const url = editingMatch ? '/api/admin/matches' : '/api/admin/matches';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchForm)
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      setMatchModal(false);
      setMatchForm({});
      setEditingMatch(null);
      fetchMatches();
      fetchLeagues();
    } else {
      showError(data.error);
    }
  };

  const handleDeleteMatch = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه المباراة؟')) return;
    const res = await fetch(`/api/admin/matches?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchMatches();
    } else {
      showError(data.error);
    }
  };

  const handleMatchToggle = async (id, toggle) => {
    const res = await fetch('/api/admin/match-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, toggle })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchMatches();
    } else {
      showError(data.error);
    }
  };

  const handleSetCustomPoints = async (id, currentPoints) => {
    const val = prompt('عدد النقاط المخصصة لهذه المباراة (تحل مكان التلقائي):', currentPoints || '');
    if (val === null) return;
    const numVal = parseInt(val);
    if (isNaN(numVal) || numVal < 1) {
      showError('أدخل رقماً صحيحاً أكبر من صفر');
      return;
    }
    const res = await fetch('/api/admin/match-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, toggle: 'points', points_value: numVal })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchMatches();
    } else {
      showError(data.error);
    }
  };

  const handleAddLeague = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const res = await fetch('/api/admin/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.get('name'), country: form.get('country') })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      e.target.reset();
      fetchLeagues();
    } else {
      showError(data.error);
    }
  };

  const handleDeleteLeague = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدوري وجميع مبارياته؟')) return;
    const res = await fetch(`/api/admin/leagues?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchLeagues();
      fetchMatches();
    } else {
      showError(data.error);
    }
  };

  const openMatchModal = (match = null) => {
    if (match) {
      setEditingMatch(match);
      setMatchForm({
        id: match.id,
        league_id: match.league_id || '',
        home_team: match.home_team,
        away_team: match.away_team,
        match_date: match.match_date,
        match_time: match.match_time || '',
        status: match.status,
        home_score: match.home_score || 0,
        away_score: match.away_score || 0,
        minute: match.minute || '',
        counts: match.counts || 0,
        fire: match.fire || 0,
        points_value: match.points_value || 3,
        custom_points: match.custom_points || 0
      });
    } else {
      setEditingMatch(null);
      setMatchForm({
        league_id: '',
        home_team: '',
        away_team: '',
        match_date: adminDate,
        match_time: '20:00',
        status: 'upcoming',
        home_score: 0,
        away_score: 0,
        minute: '',
        counts: 0,
        fire: 0,
        points_value: 3,
        custom_points: 0
      });
    }
    setMatchModal(true);
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setError(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const showError = (msg) => {
    setError(msg);
    setMessage(null);
    setTimeout(() => setError(null), 3000);
  };

  if (!approved) {
    return (
      <div className="main-container">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  const isSuper = user?.role === 'superadmin';

  return (
    <>
      <Navbar user={user} />
      <div className="main-container">
        <div className="page-header">
          <h1>👑 لوحة التحكم</h1>
          <p>{isSuper ? 'أنت مدير - لديك كل الصلاحيات' : 'أنت مشرف - إدارة عامة'}</p>
        </div>

        {message && <div className="success-msg">{message}</div>}
        {error && <div className="error-msg">{error}</div>}

        <div className="tabs">
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>👥 المستخدمين</button>
          <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>⚽ المباريات</button>
          <button className={tab === 'leagues' ? 'active' : ''} onClick={() => setTab('leagues')}>🏆 الدوريات</button>
          <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>📋 سجل النقاط</button>
          <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>🔴 المباشر</button>
          {isSuper && <button className={tab === 'admins' ? 'active' : ''} onClick={() => setTab('admins')}>⭐ إدارة المشرفين</button>}
          <button className={tab === 'chal' ? 'active' : ''} onClick={() => setTab('chal')}>🎯 التحديات</button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <>
            {tab === 'users' && (
              <div className="admin-card">
                <h3>👥 إدارة المستخدمين ({users.length})</h3>
                <div style={{overflowX: 'auto'}}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>رقم الجوال</th>
                        <th>النقاط</th>
                        <th>الدور</th>
                        <th>الحالة</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{opacity: u.blocked ? 0.5 : 1}}>
                          <td style={{fontWeight: 700, color: 'var(--text-primary)'}}>{u.name}</td>
                          <td dir="ltr">{u.phone}</td>
                          <td style={{color: 'var(--gold)', fontWeight: 800}}>⭐ {u.points}</td>
                          <td>
                            {u.role === 'superadmin' && <span className="badge badge-superadmin">مدير</span>}
                            {u.role === 'admin' && <span className="badge badge-admin">مشرف</span>}
                            {u.role === 'user' && <span style={{color: 'var(--text-muted)'}}>عضو</span>}
                          </td>
                          <td>
                            {u.blocked ? <span className="badge badge-blocked">محظور</span> : <span style={{color: 'var(--success)', fontSize: '0.85rem'}}>✓ نشط</span>}
                          </td>
                          <td>
                            <div className="admin-actions">
                              <button 
                                className="btn-sm btn-outline"
                                onClick={() => handleRename(u)}
                                title="تعديل الاسم"
                              >
                                تعديل الاسم
                              </button>
                              <button 
                                className="btn-sm btn-success"
                                onClick={() => { setSelectedUser(u); setPointsModal(true); }}
                              >
                                النقاط
                              </button>
                              {u.id !== user.id && (
                                <button 
                                  className={`btn-sm ${u.blocked ? 'btn-warning' : 'btn-danger'}`}
                                  onClick={() => handleBlock(u.id, !u.blocked)}
                                >
                                  {u.blocked ? 'إلغاء الحظر' : 'حظر'}
                                </button>
                              )}
                              {isSuper && u.id !== user.id && u.role !== 'superadmin' && (
                                <button 
                                  className="btn-sm btn-outline"
                                  onClick={() => handleRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                >
                                  {u.role === 'admin' ? 'إزالة مشرف' : 'جعله مشرف'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'live' && (
              <div className="admin-card">
                <h3>🔴 الاتصال بالمباشر (API-Football)</h3>
                <p style={{color: 'var(--text-muted)', marginBottom: 16}}>
                  هذا يربط الموقع بـ api-sports.io ويجلب مباريات اليوم الحقيقية والنتائج المباشرة وشعارات الفرق تلقائياً.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await fetch('/api/admin/live', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: liveKey, enabled: liveEnabled })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      showMessage(data.message);
                      setLiveKey('');
                      fetchLiveStatus();
                    } else {
                      showError(data.error);
                    }
                  }}
                  style={{marginBottom: 20}}
                >
                  <div style={{display: 'grid', gap: 12}}>
                    <div className="form-group">
                      <label>مفتاح API-Football (x-apisports-key)</label>
                      <input
                        type="password"
                        value={liveKey}
                        onChange={e => setLiveKey(e.target.value)}
                        placeholder={`${liveStatus?.has_key ? '✓ مفتاح مضبوط (اتركه فارغاً للإبقاء)' : 'أدخل مفتاحك من api-sports.io'}`}
                        autoComplete="off"
                      />
                    </div>
                    <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                      <input type="checkbox" checked={liveEnabled} onChange={e => setLiveEnabled(e.target.checked)} />
                      تفعيل جلب المباريات الحقيقية تلقائياً
                    </label>
                    <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                      <button type="submit" className="btn-success" style={{width: 'auto'}}>حفظ الإعدادات</button>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{width: 'auto'}}
                        disabled={syncing || !liveStatus?.enabled}
                        onClick={async () => {
                          setSyncing(true);
                          try {
                            const res = await fetch('/api/admin/sync', { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) { showMessage(`تمت المزامنة: ${data.count} مباراة`); fetchMatches(); }
                            else showError(data.error || 'فشلت المزامنة');
                            fetchLiveStatus();
                          } finally { setSyncing(false); }
                        }}
                      >
                        {syncing ? 'جارٍ المزامنة…' : '🔄 مزامنة الآن'}
                      </button>
                    </div>
                  </div>
                </form>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12}}>
                  <div className="live-stat">
                    <div className="label">الحالة</div>
                    <div className={liveStatus?.enabled ? 'value ok' : 'value'}>{liveStatus?.enabled ? 'مفعّل ✓' : 'متوقف'}</div>
                  </div>
                  <div className="live-stat">
                    <div className="label">المفتاح</div>
                    <div className="value">{liveStatus?.has_key ? 'موجود ✓' : 'غير مضبوط'}</div>
                  </div>
                  <div className="live-stat">
                    <div className="label">الطلبات المتبقية</div>
                    <div className="value">{liveStatus?.remaining ?? '—'} / 100 يومياً</div>
                  </div>
                  <div className="live-stat">
                    <div className="label">آخر مزامنة</div>
                    <div className="value">{liveStatus?.last_sync_count} مباراة {liveStatus?.last_sync_at ? `(${new Date(liveStatus.last_sync_at).toLocaleString('ar')})` : ''}</div>
                  </div>
                  <div className="live-stat">
                    <div className="label">آخر خطأ</div>
                    <div className="value" style={{color: liveStatus?.last_error ? 'var(--danger)' : 'var(--success)'}}>
                      {liveStatus?.last_error || 'لا يوجد'}
                    </div>
                  </div>
                </div>

                <h3 style={{marginTop: 28}}>🏆 الدوريات المعروضة في الموقع</h3>
                <p style={{color: 'var(--text-muted)', marginBottom: 12}}>
                  فقط هذه الدوريات تظهر في الموقع حتى في المباشر. الدوريات الأخرى تُعرض إذا أضفناها هنا. (القائمة تُطبَّق عند المزامنة)
                </p>
                <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                    <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
                    عرض جميع الدوريات (بدون حصر)
                  </label>
                  <button
                    type="button"
                    className="btn-sm btn-success"
                    onClick={async () => {
                      const res = await fetch('/api/admin/live', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ show_all: showAll, shown_ids: shownIds })
                      });
                      const data = await res.json();
                      if (res.ok) { showMessage('تم حفظ القائمة وتحديث المباريات'); fetchLiveStatus(); fetchMatches(); }
                      else showError(data.error);
                    }}
                  >
                    حفظ القائمة والمزامنة
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-outline"
                    onClick={() => setShownIds([])}
                  >
                    إلغاء التحديد
                  </button>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8}}>
                  {knownLeagues.map(l => {
                    const apiId = l.api_id != null ? Number(l.api_id) : null;
                    const checked = showAll || (apiId != null && shownIds.includes(apiId));
                    return (
                      <label key={l.lid} style={{
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
                        background: 'var(--bg-card)'
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={showAll}
                          onChange={e => {
                            if (apiId == null) return;
                            const next = e.target.checked
                              ? [...new Set([...shownIds, apiId])]
                              : shownIds.filter(id => id !== apiId);
                            setShownIds(next);
                          }}
                        />
                        <span style={{fontWeight: 600, fontSize: '0.9rem', flex: 1}}>{l.name}</span>
                        <span style={{color: 'var(--text-muted)', fontSize: '0.8rem'}} dir="ltr">#{apiId}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === 'admins' && isSuper && (
              <div className="admin-card">
                <h3>⭐ إدارة المشرفين</h3>
                <p style={{color: 'var(--text-muted)', marginBottom: 16}}>
                  قم بترقية أي عضو إلى مشرف من قائمة المستخدمين، أو أزله مباشرة
                </p>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12}}>
                  {users.filter(u => u.role !== 'user').map(u => (
                    <div key={u.id} style={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16}}>
                      <div style={{fontWeight: 700}}>{u.name}</div>
                      <div style={{color: 'var(--text-muted)', fontSize: '0.85rem'}} dir="ltr">{u.phone}</div>
                      <div style={{marginTop: 10}}>
                        <span className={`badge ${u.role === 'superadmin' ? 'badge-superadmin' : 'badge-admin'}`}>
                          {u.role === 'superadmin' ? '👑 المدير' : '⭐ مشرف'}
                        </span>
                      </div>
                      {u.role === 'admin' && u.id !== user.id && (
                        <button className="btn-sm btn-danger" style={{marginTop: 10}} onClick={() => handleRole(u.id, 'user')}>
                          إزالة الصلاحية
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'matches' && (
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16}}>
                  <button
                    className={`btn-sm ${adminDate === todayStr() ? 'btn-success' : 'btn-outline'}`}
                    onClick={() => setAdminDate(todayStr())}
                  >
                    📅 اليوم
                  </button>
                  <button
                    className={`btn-sm ${adminDate === tomorrowStr() ? 'btn-success' : 'btn-outline'}`}
                    onClick={() => setAdminDate(tomorrowStr())}
                  >
                    ⏭ غداً
                  </button>
                  <input
                    type="date"
                    value={adminDate}
                    onChange={e => setAdminDate(e.target.value)}
                    style={{padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)'}}
                  />
                </div>
                <button className="btn-primary" style={{width: 'auto', marginBottom: 16}} onClick={() => openMatchModal()}>
                  + إضافة مباراة (اليوم: {adminDate === todayStr() ? 'اليوم' : adminDate === tomorrowStr() ? 'غداً' : adminDate})
                </button>
                <div style={{display: 'grid', gap: 12}}>
                  {matches.length === 0 ? (
                    <div className="empty-state">
                      <div className="icon">⚽</div>
                      <p>{adminDate === todayStr() ? 'لا توجد مباريات اليوم' : adminDate === tomorrowStr() ? 'لا توجد مباريات غداً — أضف أو زامن من API' : `لا توجد مباريات في ${adminDate}`}</p>
                    </div>
                  ) : (
                    matches.map(m => (
                      <div key={m.id} className="admin-card" style={{padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'}}>
                        <div style={{flex: 1, minWidth: 220}}>
                          <span className={`badge ${m.status === 'live' ? 'badge-superadmin' : m.status === 'finished' ? '' : 'badge-admin'}`} style={{marginBottom: 6, display: 'inline-block'}}>
                            {m.league_name || 'غير محدد'}
                          </span>
                          {m.fire ? (
                            <span className="badge badge-fire" style={{marginBottom: 6, display: 'inline-block'}}>🔥 نارية</span>
                          ) : m.counts ? (
                            <span className="badge badge-count" style={{marginBottom: 6, display: 'inline-block'}}>💰 تحسب</span>
                          ) : (
                            <span className="badge" style={{marginBottom: 6, display: 'inline-block'}}>👁 للعرض</span>
                          )}
                          {m.featured ? (
                            <span className="badge badge-featured" style={{marginBottom: 6, display: 'inline-block'}}>⭐ الغرفة الخاصة</span>
                          ) : null}
                          {m.custom_points === 1 ? (
                            <span className="badge" style={{marginBottom: 6, display: 'inline-block', background: 'var(--gold)', color: '#000'}}>⚙️ {m.points_value} نقطة مخصصة</span>
                          ) : null}
                          <div style={{fontWeight: 700}}>
                            {m.home_team} vs {m.away_team}
                          </div>
                          <div style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>
                            {m.match_date} • {m.match_time} • 
                            {m.status === 'finished' ? ` النتيجة: ${m.home_score} - ${m.away_score}` : m.status === 'live' ? ` ${m.home_score} - ${m.away_score} (${m.minute}')` : ' لم تبدأ'}
                          </div>
                        </div>
                        <div className="admin-actions">
                          <button
                            className={`btn-sm ${m.featured ? 'btn-warning' : 'btn-outline'}`}
                            onClick={() => handleMatchToggle(m.id, 'featured')}
                          >
                            {m.featured ? 'إلغاء المميزة' : '⭐ مميزة'}
                          </button>
                          <button
                            className={`btn-sm ${m.counts || m.fire ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleMatchToggle(m.id, 'counts')}
                          >
                            {m.counts || m.fire ? 'إيقاف الاحتساب' : 'احتساب'}
                          </button>
                          <button
                            className={`btn-sm ${m.fire ? 'btn-warning' : 'btn-outline'}`}
                            onClick={() => handleMatchToggle(m.id, 'fire')}
                          >
                            {m.fire ? 'إلغاء النارية' : '🔥 نارية'}
                          </button>
                          <button className="btn-sm btn-outline" onClick={() => handleSetCustomPoints(m.id, m.custom_points === 1 ? m.points_value : '')}>
                            ⚙️ نقاط المباراة
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 'leagues' && (
              <div className="admin-card">
                <h3>🏆 إدارة الدوريات</h3>
                <form onSubmit={handleAddLeague} style={{display: 'flex', gap: 10, marginBottom: 20}}>
                  <div className="form-group" style={{flex: 2, margin: 0}}>
                    <input type="text" name="name" placeholder="اسم الدوري (مثال: دوري روشن)" required />
                  </div>
                  <div className="form-group" style={{flex: 1, margin: 0}}>
                    <input type="text" name="country" placeholder="الدولة (اختياري)" />
                  </div>
                  <button type="submit" className="btn-sm btn-success" style={{whiteSpace: 'nowrap'}}>إضافة</button>
                </form>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12}}>
                  {leagues.map(l => (
                    <div key={l.id} style={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                      <div>
                        <div style={{fontWeight: 700}}>🏆 {l.name}</div>
                        <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{l.country}</div>
                      </div>
                      <button className="btn-sm btn-danger" onClick={() => handleDeleteLeague(l.id)}>حذف</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'logs' && (
              <div className="admin-card">
                <h3>📋 سجل النقاط</h3>
                <div style={{overflowX: 'auto'}}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>المستخدم</th>
                        <th>النقاط</th>
                        <th>السبب</th>
                        <th>بواسطة</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointLogs.length === 0 ? (
                        <tr><td colSpan="5" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '30px'}}>لا توجد عمليات نقاط بعد</td></tr>
                      ) : (
                        pointLogs.map(log => (
                          <tr key={log.id}>
                            <td style={{fontWeight: 600}}>{log.user_name}</td>
                            <td style={{color: log.points >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 800}}>
                              {log.points >= 0 ? '+' : ''}{log.points}
                            </td>
                            <td>{log.reason}</td>
                            <td>{log.admin_name || 'تلقائي'}</td>
                            <td style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{log.created_at}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'chal' && (
              <ChallengesAdmin isSuper={isSuper} showError={showError} showMessage={showMessage} />
            )}
          </>
        )}
      </div>

      {pointsModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setPointsModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⭐ تعديل نقاط {selectedUser.name}</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: 16}}>
              النقاط الحالية: <span style={{color: 'var(--gold)', fontWeight: 800}}>{selectedUser.points}</span>
            </p>
            <form onSubmit={handlePoints}>
              <div className="form-group">
                <label>عدد النقاط (موجب للإضافة، سالب للخصم)</label>
                <input 
                  type="number" 
                  value={pointsValue} 
                  onChange={e => setPointsValue(e.target.value)} 
                  placeholder="مثال: +10 أو -5" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>السبب</label>
                <input 
                  type="text" 
                  value={pointsReason} 
                  onChange={e => setPointsReason(e.target.value)} 
                  placeholder="مثال: فوز بالتوقع الصحيح" 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-sm btn-outline" onClick={() => setPointsModal(false)}>إلغاء</button>
                <button type="submit" className="btn-sm btn-success">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {matchModal && (
        <div className="modal-overlay" onClick={() => setMatchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingMatch ? 'تعديل مباراة' : 'إضافة مباراة جديدة'}</h2>
            <form onSubmit={handleSaveMatch}>
              <div className="form-group">
                <label>الدوري</label>
                <select 
                  value={matchForm.league_id} 
                  onChange={e => setMatchForm({...matchForm, league_id: e.target.value})}
                >
                  <option value="">— اختر الدوري —</option>
                  {leagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                <div className="form-group">
                  <label>الفريق الأول</label>
                  <input 
                    type="text" 
                    value={matchForm.home_team} 
                    onChange={e => setMatchForm({...matchForm, home_team: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>الفريق الثاني</label>
                  <input 
                    type="text" 
                    value={matchForm.away_team} 
                    onChange={e => setMatchForm({...matchForm, away_team: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                <div className="form-group">
                  <label>التاريخ</label>
                  <input 
                    type="date" 
                    value={matchForm.match_date} 
                    onChange={e => setMatchForm({...matchForm, match_date: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>الوقت</label>
                  <input 
                    type="time" 
                    value={matchForm.match_time} 
                    onChange={e => setMatchForm({...matchForm, match_time: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>الحالة</label>
                <select 
                  value={matchForm.status} 
                  onChange={e => setMatchForm({...matchForm, status: e.target.value})}
                >
                  <option value="upcoming">قادمة</option>
                  <option value="live">مباشرة</option>
                  <option value="finished">انتهت</option>
                </select>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input 
                    type="checkbox" 
                    checked={!!matchForm.counts || !!matchForm.fire} 
                    onChange={e => setMatchForm({...matchForm, counts: e.target.checked ? 1 : 0})} 
                  />
                  تحسب نقاط
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input 
                    type="checkbox" 
                    checked={!!matchForm.fire} 
                    onChange={e => setMatchForm({...matchForm, fire: e.target.checked ? 1 : 0})} 
                  />
                  🔥 مباراة نارية
                </label>
              </div>
              <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input 
                    type="checkbox"
                    checked={!!matchForm.custom_points}
                    onChange={e => setMatchForm({...matchForm, custom_points: e.target.checked ? 1 : 0})}
                  />
                  ⚙️ نقاط مخصصة لهذه المباراة (تحل مكان النقاط التلقائية)
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={matchForm.points_value} 
                  onChange={e => setMatchForm({...matchForm, points_value: parseInt(e.target.value) || 0})}
                  disabled={!matchForm.custom_points}
                  placeholder="مثال: 5"
                />
                <small style={{color: 'var(--text-muted)'}}>
                  تلقائي: نتيجة دقيقة = 1 • نارية 🔥 = 2 • المتوقّع الوحيد الصحيح = +1
                  {" — مخصص: النقاط اللي تكتبها فقط بلا إضافات"}
                </small>
              </div>
              {matchForm.status !== 'upcoming' && (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10}}>
                  <div className="form-group">
                    <label>هدف الفريق الأول</label>
                    <input 
                      type="number" 
                      value={matchForm.home_score} 
                      onChange={e => setMatchForm({...matchForm, home_score: parseInt(e.target.value) || 0})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>هدف الفريق الثاني</label>
                    <input 
                      type="number" 
                      value={matchForm.away_score} 
                      onChange={e => setMatchForm({...matchForm, away_score: parseInt(e.target.value) || 0})} 
                    />
                  </div>
                  {matchForm.status === 'live' && (
                    <div className="form-group">
                      <label>الدقيقة</label>
                      <input 
                        type="text" 
                        value={matchForm.minute} 
                        onChange={e => setMatchForm({...matchForm, minute: e.target.value})} 
                        placeholder="مثال: 67'" 
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-sm btn-outline" onClick={() => setMatchModal(false)}>إلغاء</button>
                <button type="submit" className="btn-sm btn-success">
                  {editingMatch ? 'حفظ التعديلات' : 'إضافة المباراة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

const CH_LEAGUES = {
  EPL: 'الدوري الإنجليزي الممتاز',
  LIGA: 'الدوري الإسباني',
  SAU: 'دوري روشن السعودي',
  UCL: 'دوري أبطال أوروبا',
};

const CH_CATS = [
  { key: 'champion', name: 'بطل الدوري' },
  { key: 'top_scorer', name: 'الهداف' },
  { key: 'best_player', name: 'أفضل لاعب' },
];

const COACH_LEAGUES = [
  { key: 'EPL', name: 'الإنجليزي' },
  { key: 'LIGA', name: 'الإسباني' },
  { key: 'SAU', name: 'روشن' },
];

const POSITIONS = [
  { key: 'GK', name: 'حارس' },
  { key: 'DEF', name: 'مدافع' },
  { key: 'MID', name: 'وسط' },
  { key: 'FWD', name: 'مهاجم' },
];

function ChallengesAdmin({ isSuper, showError, showMessage }) {
  const [sub, setSub] = useState('champions');

  // ——— التحديات: تحدي الأبطال ———
  const [chOptions, setChOptions] = useState(null);
  const [chSettle, setChSettle] = useState({});
  const [chBusy, setChBusy] = useState(false);

  // ——— التحديات: انت المدرب ———
  const [coachData, setCoachData] = useState(null);
  const [addPlayer, setAddPlayer] = useState({ name: '', club: '', position: 'FWD', league: 'EPL', market: 10 });
  const [ptsInput, setPtsInput] = useState({});
  const [settleWeek, setSettleWeek] = useState(0);
  const [coachBusy, setCoachBusy] = useState(false);

  // ——— التحديات: المتجر ———
  const [storeData, setStoreData] = useState(null);
  const [addItem, setAddItem] = useState({ title: '', icon: '🎁', desc: '', price: 100, type: 'item', value: 0 });
  const [storeBusy, setStoreBusy] = useState(false);

  useEffect(() => {
    if (sub === 'champions') {
      fetch('/api/champions').then(r => r.json()).then(d => {
        setChOptions(d || {});
        const init = {};
        for (const L of Object.keys(d?.options || {})) {
          for (const c of CH_CATS) {
            const res = d?.results?.[L]?.[c.key];
            init[`${L}__${c.key}`] = { winner: res?.winner || '', award: res?.award_bombs || 100 };
          }
        }
        setChSettle(init);
      }).catch(() => {});
    } else if (sub === 'coach') {
      fetch('/api/admin/coach').then(r => r.json()).then(d => {
        setCoachData(d || { week: 0, players: [], points: [], settled: [], weeks: [] });
        setSettleWeek(d?.week || 0);
        const pts = {};
        for (const p of d?.points || []) pts[`${p.week}__${p.player_id}`] = p.points;
        setPtsInput(pts);
      }).catch(() => {});
    } else if (sub === 'store') {
      fetch('/api/admin/store').then(r => r.json()).then(d => setStoreData(d || { items: [], purchases: [] })).catch(() => {});
    }
  }, [sub]);

  const settleChampion = async (league, category) => {
    if (!isSuper) return showError('تحتاج صلاحية المدير لإعلان النتائج');
    const f = chSettle[`${league}__${category}`];
    if (!f || !f.winner) return showError('اختر الفائز أولاً');
    setChBusy(true);
    const res = await fetch('/api/admin/champions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ league, category, winner: f.winner, award_bombs: Number(f.award) || 0 }),
    });
    const d = await res.json();
    if (res.ok) showMessage(d.message); else showError(d.error || 'فشل');
    setChBusy(false);
    fetch('/api/champions').then(r => r.json()).then(setChOptions).catch(() => {});
  };

  const addCoachPlayer = async (e) => {
    e.preventDefault();
    setCoachBusy(true);
    const res = await fetch('/api/admin/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_player', ...addPlayer, market_value_m: Number(addPlayer.market) || 0 }),
    });
    const d = await res.json();
    if (res.ok) { showMessage(d.message); setAddPlayer({ name: '', club: '', position: 'FWD', league: 'EPL', market: 10 }); }
    else showError(d.error || 'فشل');
    setCoachBusy(false);
    fetch('/api/admin/coach').then(r => r.json()).then(setCoachData).catch(() => {});
  };

  const saveWeeklyPoints = async () => {
    setCoachBusy(true);
    const week = Number(settleWeek) || coachData?.week;
    const entries = Object.entries(ptsInput)
      .filter(([k]) => Number(k.split('__')[0]) === week)
      .map(([k, v]) => ({ week, player_id: Number(k.split('__')[1]), points: Number(v) || 0 }));
    const res = await fetch('/api/admin/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_points', entries }),
    });
    const d = await res.json();
    if (res.ok) showMessage(d.message); else showError(d.error || 'فشل');
    setCoachBusy(false);
  };

  const settleCoachWeek = async () => {
    const week = Number(settleWeek) || coachData?.week;
    if (!window.confirm(`تسوية أسبوع ${week} وتحويل النقاط بمبات للمدربين؟`)) return;
    setCoachBusy(true);
    const res = await fetch('/api/admin/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'settle_week', week }),
    });
    const d = await res.json();
    if (res.ok) showMessage(d.message); else showError(d.error || 'فشل');
    setCoachBusy(false);
    fetch('/api/admin/coach').then(r => r.json()).then(setCoachData).catch(() => {});
  };

  const addStoreItem = async (e) => {
    e.preventDefault();
    setStoreBusy(true);
    const res = await fetch('/api/admin/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addItem),
    });
    const d = await res.json();
    if (res.ok) { showMessage(d.message); setAddItem({ title: '', icon: '🎁', desc: '', price: 100, type: 'item', value: 0 }); }
    else showError(d.error || 'فشل');
    setStoreBusy(false);
    fetch('/api/admin/store').then(r => r.json()).then(setStoreData).catch(() => {});
  };

  const delStoreItem = async (id) => {
    if (!confirm('حذف العنصر؟')) return;
    await fetch(`/api/admin/store?id=${id}`, { method: 'DELETE' });
    fetch('/api/admin/store').then(r => r.json()).then(setStoreData).catch(() => {});
  };

  return (
    <div className="admin-card">
      <div className="tabs">
        <button className={sub === 'champions' ? 'active' : ''} onClick={() => setSub('champions')}>👑 تحدي الأبطال</button>
        <button className={sub === 'coach' ? 'active' : ''} onClick={() => setSub('coach')}>🧢 أنت المدرب</button>
        <button className={sub === 'store' ? 'active' : ''} onClick={() => setSub('store')}>🛒 المتجر</button>
      </div>

      {sub === 'champions' && (
        <div style={{ marginTop: 16 }}>
          <h3>👑 إعلان نتائج تحدي الأبطال</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>
            عند الإعلان تُضاف البمبات فوراً لأصحاب الإجابات الصحيحة • لا يمكن تكرار الصرف لنفس التوقع
          </p>
          {!chOptions ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {Object.keys(CH_LEAGUES).map((L) => (
                <div key={L} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <h4 style={{ marginBottom: 10 }}>{CH_LEAGUES[L]}</h4>
                  {CH_CATS.map((c) => {
                    const opts = chOptions.options?.[L]?.[c.key] || [];
                    const key = `${L}__${c.key}`;
                    const res = chOptions.results?.[L]?.[c.key];
                    return (
                      <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap', marginBottom: 10 }}>
                        <div className="form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
                          <label>{c.name}</label>
                          <select value={chSettle[key]?.winner || ''} onChange={(e) => setChSettle({ ...chSettle, [key]: { ...chSettle[key], winner: e.target.value } })}>
                            <option value="">— اختر الفائز —</option>
                            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          {res && <small style={{ color: 'var(--success)' }}>الإعلان الحالي: {res.winner} (+{res.award_bombs} بمبه)</small>}
                        </div>
                        <div className="form-group" style={{ width: 110, margin: 0 }}>
                          <label>الجائزة</label>
                          <input type="number" min="0" value={chSettle[key]?.award || 0} onChange={(e) => setChSettle({ ...chSettle, [key]: { ...chSettle[key], award: e.target.value } })} />
                        </div>
                        <button type="button" className="btn-sm btn-success" disabled={chBusy} onClick={() => settleChampion(L, c.key)}>
                          إعلان وصرف
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sub === 'coach' && (
        <div style={{ marginTop: 16 }}>
          <h3>🧢 إدارة «أنت المدرب»</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>
            أسبوع النقاط الحالي: <b>{coachData?.week ?? '…'}</b> • الأسواق: 15 لاعباً • 3 من كل نادي
          </p>

          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <h4>➕ إضافة لاعب</h4>
            <form onSubmit={addCoachPlayer} style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>الاسم</label>
                  <input type="text" value={addPlayer.name} onChange={(e) => setAddPlayer({ ...addPlayer, name: e.target.value })} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>النادي</label>
                  <input type="text" value={addPlayer.club} onChange={(e) => setAddPlayer({ ...addPlayer, club: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>المركز</label>
                  <select value={addPlayer.position} onChange={(e) => setAddPlayer({ ...addPlayer, position: e.target.value })}>
                    {POSITIONS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>الدوري</label>
                  <select value={addPlayer.league} onChange={(e) => setAddPlayer({ ...addPlayer, league: e.target.value })}>
                    {COACH_LEAGUES.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>القيمة (مليون €)</label>
                  <input type="number" min="1" value={addPlayer.market} onChange={(e) => setAddPlayer({ ...addPlayer, market: e.target.value })} />
                </div>
              </div>
              <div>
                <button type="submit" className="btn-sm btn-success" disabled={coachBusy}>إضافة (السعر = القيمة × 10)</button>
              </div>
            </form>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap', marginBottom: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>الأسبوع</label>
                <input type="number" value={settleWeek} onChange={(e) => setSettleWeek(e.target.value)} />
              </div>
              <button type="button" className="btn-sm btn-outline" disabled={coachBusy} onClick={saveWeeklyPoints}>
                حفظ نقاط الأسبوع
              </button>
              <button type="button" className="btn-sm btn-success" disabled={coachBusy} onClick={settleCoachWeek}>
                🏁 تسوية الأسبوع وتحويلها بمبات
              </button>
              {coachData?.settled?.includes(Number(settleWeek)) && (
                <span className="badge badge-count">الأسبوع مسوّى ✓</span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>اللاعب</th>
                    <th>النادي</th>
                    <th>المركز</th>
                    <th>نقاط أسبوع {settleWeek}</th>
                  </tr>
                </thead>
                <tbody>
                  {(coachData?.players || []).map((p) => {
                    const key = `${Number(settleWeek)}__${p.id}`;
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td>{p.club}</td>
                        <td>{POSITIONS.find((x) => x.key === p.position)?.name || p.position}</td>
                        <td>
                          <input type="number" style={{ width: 80 }} value={ptsInput[key] ?? 0} onChange={(e) => setPtsInput({ ...ptsInput, [key]: e.target.value })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {sub === 'store' && (
        <div style={{ marginTop: 16 }}>
          <h3>🛒 إدارة المتجر</h3>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <h4>➕ إضافة عنصر</h4>
            <form onSubmit={addStoreItem} style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>العنوان</label>
                  <input type="text" value={addItem.title} onChange={(e) => setAddItem({ ...addItem, title: e.target.value })} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>الأيقونة</label>
                  <input type="text" value={addItem.icon} onChange={(e) => setAddItem({ ...addItem, icon: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>السعر (بمبة)</label>
                  <input type="number" min="1" value={addItem.price} onChange={(e) => setAddItem({ ...addItem, price: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>النوع</label>
                  <select value={addItem.type} onChange={(e) => setAddItem({ ...addItem, type: e.target.value })}>
                    <option value="item">عنصر عادي</option>
                    <option value="bombs">بمبات فورية</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>قيمة (للبمبات الفورية)</label>
                  <input type="number" min="0" value={addItem.value} onChange={(e) => setAddItem({ ...addItem, value: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>الوصف</label>
                <input type="text" value={addItem.desc} onChange={(e) => setAddItem({ ...addItem, desc: e.target.value })} />
              </div>
              <div>
                <button type="submit" className="btn-sm btn-success" disabled={storeBusy}>إضافة</button>
              </div>
            </form>
          </div>

          <h4>العناصر ({storeData?.items?.length || 0})</h4>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>العنصر</th>
                  <th>السعر</th>
                  <th>النوع</th>
                  <th>عمليات</th>
                </tr>
              </thead>
              <tbody>
                {(storeData?.items || []).map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.icon} {it.title} <small style={{ color: 'var(--text-muted)' }}>{it.description}</small></td>
                    <td style={{ color: 'var(--gold)' }}>{it.price} 🪙</td>
                    <td>{it.type === 'bombs' ? `فوري (+${it.value})` : 'عادي'}</td>
                    <td><button type="button" className="btn-sm btn-danger" onClick={() => delStoreItem(it.id)}>حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4>سجل المشتريات ({storeData?.purchases?.length || 0})</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>العضو</th>
                  <th>العنصر</th>
                  <th>السعر</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {(storeData?.purchases || []).map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.user_name}</td>
                    <td>{p.icon} {p.title}</td>
                    <td style={{ color: 'var(--gold)' }}>{p.price} 🪙</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}