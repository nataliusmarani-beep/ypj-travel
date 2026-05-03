const router = require('express').Router();
const multer = require('multer');
const { pool } = require('../db');

const isPIC = r => r === 'Manager' || r === 'PIC Travel';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed.'));
  },
});

// GET /api/airfast  — list metadata (no file_data)
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT id, filename, file_size, uploaded_by, uploaded_by_name, uploaded_at, status
    FROM airfast_schedules
    ORDER BY uploaded_at DESC
  `);
  res.json(rows);
});

// POST /api/airfast  — upload new PDF (PIC/Manager only)
router.post('/', (req, res, next) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  next();
}, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PDF file is required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Expire all existing active records
    await client.query(`UPDATE airfast_schedules SET status='expired' WHERE status='active'`);
    // Insert new record
    const { rows: [rec] } = await client.query(`
      INSERT INTO airfast_schedules (filename, file_size, file_data, uploaded_by, uploaded_by_name, status)
      VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id, filename, file_size, uploaded_by, uploaded_by_name, uploaded_at, status
    `, [req.file.originalname, req.file.size, req.file.buffer, req.user.id, req.user.name]);
    await client.query('COMMIT');
    res.status(201).json(rec);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// GET /api/airfast/:id/download  — stream PDF
router.get('/:id/download', async (req, res) => {
  const { rows: [rec] } = await pool.query(
    'SELECT filename, file_data FROM airfast_schedules WHERE id=$1', [req.params.id]
  );
  if (!rec) return res.status(404).json({ error: 'Not found.' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${rec.filename}"`);
  res.send(rec.file_data);
});

// DELETE /api/airfast/:id  — delete (PIC/Manager only)
router.delete('/:id', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
  await pool.query('DELETE FROM airfast_schedules WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
