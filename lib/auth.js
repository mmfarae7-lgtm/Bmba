const jwt = require('jsonwebtoken');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is required in production'); })() : 'bomba-secret-key-2024');

class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

function errorResponse(e) {
  const status = e && e.status ? e.status : 500;
  return (require('next/server').NextResponse).json({ error: e.message || 'خطأ في الخادم' }, { status });
}

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

async function getUserFromRequest(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const token = cookies.token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = await db.prepare('SELECT id, name, phone, email, points, role, blocked, avatar, phone_code, country, gender, birth_date, bombs, invite_code, invited_by, notifications FROM users WHERE id = ?').get(decoded.id);
      if (user && !user.blocked) return user;
    }
    return null;
  }
  if (cookies.guest === '1') {
    return { id: -1, name: 'ضيف', phone: null, email: null, points: 0, role: 'guest', guest: true, blocked: 0 };
  }
  return null;
}

async function requireAuth(req) {
  const user = await getUserFromRequest(req);
  if (!user || user.guest) throw new ApiError('غير مصرح - سجل الدخول أولاً', 401);
  return user;
}

async function requireAdmin(req) {
  const user = await requireAuth(req);
  if (user.role !== 'admin' && user.role !== 'superadmin') throw new ApiError('غير مصرح للمشرف', 403);
  return user;
}

async function requireSuperAdmin(req) {
  const user = await requireAuth(req);
  if (user.role !== 'superadmin') throw new ApiError('غير مصرح للمدير', 403);
  return user;
}

module.exports = { generateToken, verifyToken, getUserFromRequest, requireAuth, requireAdmin, requireSuperAdmin, ApiError, errorResponse, SECRET };