const router   = require('express').Router();
const { pool } = require('../db');
const { sendRequestNotification, sendBookingNotification } = require('../mailer');
const { notifyPIC, notifyUser } = require('../telegram');
const multer   = require('multer');
const upload   = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
    SELECT tr.id, tr.submitter_id, tr.submitter_name, tr.status, tr.request_type, tr.travel_purpose,
           tr.transport_type, tr.outbound_from, tr.outbound_to, tr.outbound_date,
           tr.has_inbound, tr.inbound_from, tr.inbound_to, tr.inbound_date,
           tr.notes, tr.pic_notes, tr.pic_action_by, tr.pic_action_at,
           tr.payment_deadline, tr.booking_attachment_name,
           tr.payment_notes, tr.payment_attachment_name,
           tr.submitted_at, tr.updated_at, tr.airplane_type, tr.rti_event_id,
           re.name AS rti_event_name
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

// ── Update passenger booking ref + payment deadline + attachment (PIC Travel) ─
router.patch('/:id/passengers/:pid', upload.single('attachment'), async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { booking_ref, seat_number, booking_status, payment_deadline } = req.body;

  await pool.query(
    `UPDATE passengers SET booking_ref=$1, seat_number=$2, booking_status=$3 WHERE id=$4 AND request_id=$5`,
    [booking_ref||null, seat_number||null, booking_status||'pending', req.params.pid, req.params.id]
  );

  // Update request-level booking fields
  const updates = [];
  const vals    = [];
  let   idx     = 1;

  if (payment_deadline) { updates.push(`payment_deadline=$${idx++}`); vals.push(payment_deadline); }

  if (req.file) {
    updates.push(`booking_attachment_name=$${idx++}`); vals.push(req.file.originalname);
    updates.push(`booking_attachment_data=$${idx++}`); vals.push(req.file.buffer);
  }

  // Auto-set status to booked when payment deadline or attachment is saved
  if (payment_deadline || req.file) {
    updates.push(`status='booked'`);
    updates.push(`pic_action_by=$${idx++}`);   vals.push(req.user.name);
    updates.push(`pic_action_at=NOW()`);
    updates.push(`updated_at=NOW()`);
  }

  if (updates.length > 0) {
    vals.push(req.params.id);
    await pool.query(
      `UPDATE travel_requests SET ${updates.join(', ')} WHERE id=$${idx}`,
      vals
    );
  }

  res.json({ ok: true });
});

// ── Download booking attachment ────────────────────────────────────────────
router.get('/:id/attachment', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT booking_attachment_name, booking_attachment_data FROM travel_requests WHERE id=$1`,
    [req.params.id]
  );
  if (!rows[0] || !rows[0].booking_attachment_data)
    return res.status(404).json({ error: 'No attachment found.' });
  const { booking_attachment_name, booking_attachment_data } = rows[0];
  res.setHeader('Content-Disposition', `attachment; filename="${booking_attachment_name}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(booking_attachment_data);
});

// ── Download payment attachment ────────────────────────────────────────────
router.get('/:id/payment-attachment', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT payment_attachment_name, payment_attachment_data FROM travel_requests WHERE id=$1`,
    [req.params.id]
  );
  if (!rows[0] || !rows[0].payment_attachment_data)
    return res.status(404).json({ error: 'No payment attachment found.' });
  res.setHeader('Content-Disposition', `attachment; filename="${rows[0].payment_attachment_name}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(rows[0].payment_attachment_data);
});

// ── Booking flow section save (PIC Travel) ─────────────────────────────────
router.patch('/:id/section', upload.single('attachment'), async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { section, pic_notes, payment_deadline, payment_notes, booking_refs_json } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (section === 'processing') {
      const vals = [pic_notes || null, req.user.name, req.params.id];
      let q = `UPDATE travel_requests SET status='processing', pic_notes=$1, pic_action_by=$2, pic_action_at=NOW(), updated_at=NOW()`;
      if (req.file) {
        q += `, booking_attachment_name=$4, booking_attachment_data=$5`;
        vals.splice(2, 0, req.file.originalname, req.file.buffer);
        vals[vals.length - 1] = req.params.id;
      }
      q += ` WHERE id=$${vals.length}`;
      await client.query(q, vals);

    } else if (section === 'booked') {
      await client.query(
        `UPDATE travel_requests SET status='booked', payment_deadline=$1, pic_action_by=$2, pic_action_at=NOW(), updated_at=NOW() WHERE id=$3`,
        [payment_deadline || null, req.user.name, req.params.id]
      );
      if (booking_refs_json) {
        const refs = JSON.parse(booking_refs_json);
        for (const { pax_id, booking_ref } of refs) {
          await client.query(
            `UPDATE passengers SET booking_ref=$1 WHERE id=$2 AND request_id=$3`,
            [booking_ref || null, pax_id, req.params.id]
          );
        }
      }

    } else if (section === 'payment') {
      const vals = [payment_notes || null, req.user.name, req.params.id];
      let q = `UPDATE travel_requests SET status='awaiting_payment', payment_notes=$1, pic_action_by=$2, pic_action_at=NOW(), updated_at=NOW()`;
      if (req.file) {
        q += `, payment_attachment_name=$4, payment_attachment_data=$5`;
        vals.splice(2, 0, req.file.originalname, req.file.buffer);
        vals[vals.length - 1] = req.params.id;
      }
      q += ` WHERE id=$${vals.length}`;
      await client.query(q, vals);

    } else if (section === 'confirmed') {
      await client.query(
        `UPDATE travel_requests SET status='confirmed', pic_action_by=$1, pic_action_at=NOW(), updated_at=NOW() WHERE id=$2`,
        [req.user.name, req.params.id]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid section.' });
    }

    await client.query('COMMIT');

    const statusMap = { processing: 'processing', booked: 'booked', payment: 'awaiting_payment', confirmed: 'confirmed' };
    res.json({ ok: true, status: statusMap[section] });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
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
