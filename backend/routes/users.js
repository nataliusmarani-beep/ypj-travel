const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const { pool } = require('../db');
const { sendWelcomeEmail } = require('../mailer');

const isPIC     = r => r === 'Manager' || r === 'PIC Travel';
const isManager = r => r === 'Manager';

// GET /api/users
router.get('/', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { rows } = await pool.query(
    'SELECT id,name,email,role,employee_id,unit,is_active,created_at FROM users ORDER BY name'
  );
  res.json(rows);
});

// GET /api/users/me
router.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id,name,email,role,employee_id,unit,campus_location,telegram_chat_id,avatar,date_of_birth,gender,nik_number,passport_id
     FROM users WHERE id=$1`, [req.user.id]
  );
  res.json(rows[0] || {});
});

// PATCH /api/users/me
router.patch('/me', async (req, res) => {
  const { name, employee_id, unit, campus_location, telegram_chat_id, avatar, date_of_birth, gender, nik_number, passport_id } = req.body;
  if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: 'Name cannot be empty.' });
  await pool.query(
    `UPDATE users SET
       name=$1, employee_id=$2, unit=$3, campus_location=$4, telegram_chat_id=$5,
       avatar=$6, date_of_birth=$7, gender=$8, nik_number=$9, passport_id=$10
     WHERE id=$11`,
    [
      name             ? String(name).trim() : null,
      employee_id      || null,
      unit             || 'PAUD',
      campus_location  || null,
      telegram_chat_id || null,
      avatar           || null,
      date_of_birth    || null,
      gender           || null,
      nik_number       || null,
      passport_id      || null,
      req.user.id,
    ]
  );
  res.json({ ok: true });
});

// ── Dependents ────────────────────────────────────────────────────────────────

// GET /api/users/me/dependents
router.get('/me/dependents', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id,prefix,name,dependent_id,age,gender,relation,ktp_number,passport_id,date_of_birth,created_at
     FROM dependents WHERE user_id=$1 ORDER BY id`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/users/me/dependents
router.post('/me/dependents', async (req, res) => {
  const { prefix, name, dependent_id, age, gender, relation, ktp_number, passport_id, date_of_birth } = req.body;
  if (!name || !relation) return res.status(400).json({ error: 'Name and relation are required.' });
  const { rows } = await pool.query(
    `INSERT INTO dependents (user_id,prefix,name,dependent_id,age,gender,relation,ktp_number,passport_id,date_of_birth)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, prefix||null, name.trim(), dependent_id||null, age||null, gender||null, relation, ktp_number||null, passport_id||null, date_of_birth||null]
  );
  res.status(201).json(rows[0]);
});

// PUT /api/users/me/dependents/:id
router.put('/me/dependents/:id', async (req, res) => {
  const { prefix, name, dependent_id, age, gender, relation, ktp_number, passport_id, date_of_birth } = req.body;
  if (!name || !relation) return res.status(400).json({ error: 'Name and relation are required.' });
  const { rowCount } = await pool.query(
    `UPDATE dependents SET prefix=$1,name=$2,dependent_id=$3,age=$4,gender=$5,relation=$6,ktp_number=$7,passport_id=$8,date_of_birth=$9
     WHERE id=$10 AND user_id=$11`,
    [prefix||null, name.trim(), dependent_id||null, age||null, gender||null, relation, ktp_number||null, passport_id||null, date_of_birth||null,
     req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Dependent not found.' });
  res.json({ ok: true });
});

// DELETE /api/users/me/dependents/:id
router.delete('/me/dependents/:id', async (req, res) => {
  await pool.query('DELETE FROM dependents WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// POST /api/users
router.post('/', async (req, res) => {
  if (!isManager(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { name, email, role, employee_id, unit } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'Name, email and role required.' });

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const hash    = bcrypt.hashSync('TEMP_' + crypto.randomBytes(8).toString('hex'), 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,role,employee_id,unit,password_hash,password_reset_token,password_reset_expires)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,role,employee_id,unit,is_active`,
      [name, email.toLowerCase().trim(), role, employee_id||null, unit||'All', hash, token, expires]
    );
    await sendWelcomeEmail({ name, email, token });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists.' });
    throw e;
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  if (!isManager(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { name, email, role, employee_id, unit, is_active, password } = req.body;
  const sets = ['name=$1','email=$2','role=$3','employee_id=$4','unit=$5','is_active=$6'];
  const vals = [name, email.toLowerCase().trim(), role, employee_id||null, unit||'All', is_active !== false];

  if (password && password.length >= 6) {
    sets.push(`password_hash=$${vals.length+1}`);
    vals.push(bcrypt.hashSync(password, 10));
  }
  vals.push(req.params.id);
  await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${vals.length}`, vals);
  res.json({ ok: true });
});

// POST /api/users/:id/invite
router.post('/:id/invite', async (req, res) => {
  if (!isManager(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const { rows } = await pool.query(
    `UPDATE users SET password_reset_token=$1, password_reset_expires=$2
     WHERE id=$3 RETURNING name,email`,
    [token, expires, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
  await sendWelcomeEmail({ name: rows[0].name, email: rows[0].email, token });
  res.json({ ok: true });
});

module.exports = router;
