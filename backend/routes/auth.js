const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool } = require('../db');

const SECRET   = process.env.JWT_SECRET || 'ypj-travel-secret-key';
const IS_PROD  = process.env.NODE_ENV === 'production';
const COOKIE   = { httpOnly:true, sameSite:'lax', secure:IS_PROD, maxAge:7*24*60*60*1000 };

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  const user = rows[0];
  if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, unit: user.unit, employee_id: user.employee_id };
  const token   = jwt.sign(payload, SECRET, { expiresIn: '7d' });
  res.cookie('token', token, COOKIE).json(payload);
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token').json({ ok: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const user = jwt.verify(token, SECRET);
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Session expired.' });
  }
});

// POST /api/auth/set-password  (token-based first login)
router.post('/set-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6)
    return res.status(400).json({ error: 'Invalid request.' });

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()', [token]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Link expired or invalid.' });

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE users SET password_hash=$1, password_reset_token=NULL, password_reset_expires=NULL WHERE id=$2',
    [hash, rows[0].id]
  );
  res.json({ ok: true });
});

module.exports = router;
