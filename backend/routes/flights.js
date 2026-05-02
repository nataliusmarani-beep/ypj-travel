const router   = require('express').Router();
const { pool } = require('../db');

const isPIC = r => r === 'Manager' || r === 'PIC Travel';

const AIRPORTS = ['TIM','CGK','UPG','SUB','DPS','YIA','MDC','BPN','PLM','MKS','BTH'];

// GET /api/flights
router.get('/', async (req, res) => {
  const { from_date, to_date, from_airport, to_airport } = req.query;
  const conditions = [];
  const vals = [];

  if (from_date)    { conditions.push(`departure_date >= $${vals.length+1}`); vals.push(from_date); }
  if (to_date)      { conditions.push(`departure_date <= $${vals.length+1}`); vals.push(to_date); }
  if (from_airport) { conditions.push(`from_airport = $${vals.length+1}`);    vals.push(from_airport); }
  if (to_airport)   { conditions.push(`to_airport = $${vals.length+1}`);      vals.push(to_airport); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT * FROM flight_schedules ${where} ORDER BY departure_date, departure_time`, vals
  );
  res.json({ flights: rows, airports: AIRPORTS });
});

// POST /api/flights
router.post('/', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { airline, flight_type, flight_number, from_airport, to_airport,
          departure_date, departure_time, arrival_time, available_seats, notes } = req.body;
  if (!airline || !from_airport || !to_airport || !departure_date)
    return res.status(400).json({ error: 'Airline, route and date required.' });

  const { rows: [f] } = await pool.query(`
    INSERT INTO flight_schedules
      (airline,flight_type,flight_number,from_airport,to_airport,
       departure_date,departure_time,arrival_time,available_seats,notes,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
  `, [airline, flight_type||'Commercial', flight_number||null, from_airport, to_airport,
      departure_date, departure_time||null, arrival_time||null,
      available_seats||null, notes||null, req.user.id]);
  res.status(201).json(f);
});

// PUT /api/flights/:id
router.put('/:id', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  const { airline, flight_type, flight_number, from_airport, to_airport,
          departure_date, departure_time, arrival_time, available_seats, notes } = req.body;
  const { rows: [f] } = await pool.query(`
    UPDATE flight_schedules SET
      airline=$1,flight_type=$2,flight_number=$3,from_airport=$4,to_airport=$5,
      departure_date=$6,departure_time=$7,arrival_time=$8,available_seats=$9,notes=$10
    WHERE id=$11 RETURNING *
  `, [airline, flight_type, flight_number||null, from_airport, to_airport,
      departure_date, departure_time||null, arrival_time||null,
      available_seats||null, notes||null, req.params.id]);
  res.json(f);
});

// DELETE /api/flights/:id
router.delete('/:id', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  await pool.query('DELETE FROM flight_schedules WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
