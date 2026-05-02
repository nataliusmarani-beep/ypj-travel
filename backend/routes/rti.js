const router   = require('express').Router();
const { pool } = require('../db');
const { sendRTIAnnouncement } = require('../mailer');

const isPIC = r => r === 'Manager' || r === 'PIC Travel';

// GET /api/rti  — list events
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT re.*,
      u.name AS created_by_name,
      (SELECT COUNT(*) FROM travel_requests tr WHERE tr.rti_event_id = re.id) AS submission_count
    FROM rti_events re
    LEFT JOIN users u ON re.created_by = u.id
    ORDER BY re.deadline DESC
  `);
  res.json(rows);
});

// GET /api/rti/:id  — single event + submissions
router.get('/:id', async (req, res) => {
  const { rows: [event] } = await pool.query(
    'SELECT * FROM rti_events WHERE id=$1', [req.params.id]
  );
  if (!event) return res.status(404).json({ error: 'Not found.' });

  const { rows: submissions } = await pool.query(`
    SELECT tr.*,
      (SELECT json_agg(p) FROM passengers p WHERE p.request_id = tr.id) AS passengers
    FROM travel_requests tr
    WHERE tr.rti_event_id = $1
    ORDER BY tr.submitted_at
  `, [req.params.id]);

  res.json({ ...event, submissions });
});

// POST /api/rti  — create event (PIC/Manager)
router.post('/', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { name, description, open_date, deadline, routes } = req.body;
  if (!name || !deadline) return res.status(400).json({ error: 'Name and deadline required.' });

  const { rows: [event] } = await pool.query(`
    INSERT INTO rti_events (name, description, open_date, deadline, routes, created_by)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
  `, [name, description||null, open_date||new Date(), deadline, JSON.stringify(routes||[]), req.user.id]);

  // Announce to all active staff
  if (req.body.announce) {
    const { rows: staff } = await pool.query(
      `SELECT name,email FROM users WHERE is_active=true AND role='Staff'`
    );
    for (const u of staff) {
      sendRTIAnnouncement({ event, user: u }).catch(() => {});
    }
  }
  res.status(201).json(event);
});

// PUT /api/rti/:id  — edit event
router.put('/:id', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { name, description, open_date, deadline, routes, status } = req.body;
  const { rows: [event] } = await pool.query(`
    UPDATE rti_events SET name=$1,description=$2,open_date=$3,deadline=$4,routes=$5,status=$6
    WHERE id=$7 RETURNING *
  `, [name, description||null, open_date, deadline, JSON.stringify(routes||[]), status||'open', req.params.id]);
  res.json(event);
});

module.exports = router;
