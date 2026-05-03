const router   = require('express').Router();
const { pool } = require('../db');
const { sendRequestNotification, sendBookingNotification } = require('../mailer');
const { notifyPIC, notifyUser } = require('../telegram');

const isPIC = r => r === 'Manager' || r === 'PIC Travel';

// ── List requests ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, purpose, type, from_date, to_date, my } = req.query;
  const conditions = [];
  const vals = [];

  if (my === '1' || !isPIC(req.user.role)) {
    conditions.push(`tr.submitter_id = $${vals.length+1}`); vals.push(req.user.id);
  }
  if (status)    { conditions.push(`tr.status = $${vals.length+1}`);          vals.push(status); }
  if (purpose)   { conditions.push(`tr.travel_purpose = $${vals.length+1}`);  vals.push(purpose); }
  if (type)      { conditions.push(`tr.request_type = $${vals.length+1}`);    vals.push(type); }
  if (from_date) { conditions.push(`tr.outbound_date >= $${vals.length+1}`);  vals.push(from_date); }
  if (to_date)   { conditions.push(`tr.outbound_date <= $${vals.length+1}`);  vals.push(to_date); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows } = await pool.query(`
    SELECT tr.*,
      re.name AS rti_event_name,
      (SELECT COUNT(*) FROM passengers p WHERE p.request_id = tr.id) AS passenger_count
    FROM travel_requests tr
    LEFT JOIN rti_events re ON tr.rti_event_id = re.id
    ${where}
    ORDER BY tr.submitted_at DESC
  `, vals);
  res.json(rows);
});

// ── Get single request + passengers ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { rows: [req_] } = await pool.query(`
    SELECT tr.*, re.name AS rti_event_name
    FROM travel_requests tr
    LEFT JOIN rti_events re ON tr.rti_event_id = re.id
    WHERE tr.id = $1
  `, [req.params.id]);
  if (!req_) return res.status(404).json({ error: 'Not found.' });
  if (!isPIC(req.user.role) && req_.submitter_id !== req.user.id)
    return res.status(403).json({ error: 'Forbidden.' });

  const { rows: passengers } = await pool.query(
    'SELECT * FROM passengers WHERE request_id = $1 ORDER BY id', [req.params.id]
  );
  res.json({ ...req_, passengers });
});

// ── Submit new request ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    request_type, rti_event_id,
    travel_purpose, transport_type, airplane_type, payment_method,
    outbound_type, outbound_from, outbound_to, outbound_date,
    has_inbound, inbound_type, inbound_from, inbound_to, inbound_date,
    notes, passengers,
  } = req.body;

  if (!passengers || passengers.length === 0)
    return res.status(400).json({ error: 'At least one passenger required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [newReq] } = await client.query(`
      INSERT INTO travel_requests
        (request_type,rti_event_id,submitter_id,submitter_name,submitter_email,
         travel_purpose,transport_type,airplane_type,payment_method,
         outbound_type,outbound_from,outbound_to,outbound_date,
         has_inbound,inbound_type,inbound_from,inbound_to,inbound_date,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [
      request_type||'regular', rti_event_id||null,
      req.user.id, req.user.name, req.user.email,
      travel_purpose, transport_type||'plane', airplane_type||null, payment_method||null,
      outbound_type||null, outbound_from||null, outbound_to||null, outbound_date||null,
      has_inbound||false, inbound_type||null, inbound_from||null, inbound_to||null, inbound_date||null,
      notes||null,
    ]);

    for (const p of passengers) {
      await client.query(`
        INSERT INTO passengers
          (request_id,passenger_name,uid,sponsor_uid,category,gender,date_of_birth,id_type,id_number,contact_email,phone)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        newReq.id, p.passenger_name, p.uid, p.sponsor_uid||null,
        p.category||'EMP', p.gender||null, p.date_of_birth||null,
        p.id_type||null, p.id_number||null, p.contact_email||null, p.phone||null,
      ]);
    }

    await client.query('COMMIT');

    // Notify PIC Travel
    sendRequestNotification(newReq, passengers).catch(() => {});
    notifyPIC(`✈️ New travel request from ${req.user.name}\nPurpose: ${travel_purpose} | Passengers: ${passengers.length}\nRoute: ${outbound_from||'?'} → ${outbound_to||'?'} on ${outbound_date||'?'}`).catch(() => {});

    res.status(201).json(newReq);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// ── Update status (PIC Travel) ─────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { status, pic_notes } = req.body;

  const { rows: [updated] } = await pool.query(`
    UPDATE travel_requests
    SET status=$1, pic_notes=$2, updated_at=NOW(),
        pic_action_by=$3, pic_action_at=NOW()
    WHERE id=$4 RETURNING *
  `, [status, pic_notes||null, req.user.name || req.user.email, req.params.id]);
  if (!updated) return res.status(404).json({ error: 'Not found.' });

  // Notify submitter on key status changes
  if (['booked','confirmed','cancelled'].includes(status)) {
    const { rows: passengers } = await pool.query(
      'SELECT * FROM passengers WHERE request_id=$1', [req.params.id]
    );
    sendBookingNotification(updated, passengers, status).catch(() => {});
    notifyUser(updated.submitter_email, `Your travel request #${updated.id} status: ${status.toUpperCase()}${pic_notes ? '\nNote: '+pic_notes : ''}`).catch(() => {});
  }
  res.json(updated);
});

// ── Update passenger booking ref (PIC Travel) ─────────────────────────────
router.patch('/:id/passengers/:pid', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { booking_ref, seat_number, booking_status } = req.body;
  await pool.query(
    `UPDATE passengers SET booking_ref=$1,seat_number=$2,booking_status=$3 WHERE id=$4 AND request_id=$5`,
    [booking_ref||null, seat_number||null, booking_status||'pending', req.params.pid, req.params.id]
  );
  res.json({ ok: true });
});

// ── Stats ──────────────────────────────────────────────────────────────────
router.get('/meta/stats', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { rows: [s] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='submitted') AS pending,
      COUNT(*) FILTER (WHERE status='processing') AS processing,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE DATE_TRUNC('month',submitted_at)=DATE_TRUNC('month',NOW())) AS this_month
    FROM travel_requests
  `);
  res.json(s);
});

module.exports = router;
