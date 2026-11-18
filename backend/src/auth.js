import { createHmac, timingSafeEqual } from 'node:crypto';
import 'dotenv/config';
import { pool } from './db.js';
import { verifyPassword } from './passwords.js';
const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error('SESSION_SECRET is missing. Add it to backend/.env.');

function sign(payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSession(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export async function requireAuth(req, res, next) {
  try {
    const [payload, signature, extra] = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').split('.');
    if (!payload || !signature || extra) return res.status(401).json({ error: 'Sign in is required' });
    const expected = Buffer.from(sign(payload));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      return res.status(401).json({ error: 'Session is invalid or expired' });
    }
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(data.sub) || data.exp <= Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Session is invalid or expired' });
    }
    const { rows } = await pool.query(
      'SELECT id, name, membership_id AS "membershipId", role FROM users WHERE id=$1',
      [data.sub],
    );
    if (!rows[0]) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Administrator access is required' });
  next();
}
