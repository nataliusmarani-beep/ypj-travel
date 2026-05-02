const router   = require('express').Router();
const ExcelJS  = require('exceljs');
const { pool } = require('../db');

const isPIC = r => r === 'Manager' || r === 'PIC Travel';

// GET /api/export/requests?rti_event_id=&from_date=&to_date=&purpose=
router.get('/requests', async (req, res) => {
  if (!isPIC(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });

  const { rti_event_id, from_date, to_date, purpose } = req.query;
  const conditions = [];
  const vals = [];

  if (rti_event_id) { conditions.push(`tr.rti_event_id=$${vals.length+1}`);      vals.push(rti_event_id); }
  if (from_date)    { conditions.push(`tr.outbound_date>=$${vals.length+1}`);    vals.push(from_date); }
  if (to_date)      { conditions.push(`tr.outbound_date<=$${vals.length+1}`);    vals.push(to_date); }
  if (purpose)      { conditions.push(`tr.travel_purpose=$${vals.length+1}`);    vals.push(purpose); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows } = await pool.query(`
    SELECT
      tr.id,
      tr.submitted_at,
      tr.submitter_email,
      tr.submitter_name,
      tr.travel_purpose,
      tr.transport_type,
      tr.payment_method,
      tr.status,
      tr.outbound_type,
      tr.outbound_from,
      tr.outbound_to,
      tr.outbound_date,
      tr.has_inbound,
      tr.inbound_type,
      tr.inbound_from,
      tr.inbound_to,
      tr.inbound_date,
      re.name AS rti_event,
      p.passenger_name,
      p.uid,
      p.sponsor_uid,
      p.category,
      p.gender,
      p.date_of_birth,
      p.id_type,
      p.id_number,
      p.contact_email,
      p.phone,
      p.booking_ref,
      p.seat_number,
      p.booking_status
    FROM travel_requests tr
    JOIN passengers p ON p.request_id = tr.id
    LEFT JOIN rti_events re ON tr.rti_event_id = re.id
    ${where}
    ORDER BY tr.outbound_date, p.uid
  `, vals);

  // Build Excel
  const wb = new ExcelJS.Workbook();
  wb.creator = 'YPJ Travel';
  const ws = wb.addWorksheet('Travel Requests');

  ws.columns = [
    { header:'ID',              key:'id',             width:6  },
    { header:'Submitted',       key:'submitted_at',   width:18 },
    { header:'Submitter Email', key:'submitter_email',width:26 },
    { header:'Submitter Name',  key:'submitter_name', width:22 },
    { header:'RTI Event',       key:'rti_event',      width:22 },
    { header:'Purpose',         key:'travel_purpose', width:10 },
    { header:'Transport',       key:'transport_type', width:10 },
    { header:'Payment',         key:'payment_method', width:16 },
    { header:'Status',          key:'status',         width:14 },
    { header:'Outbound Type',   key:'outbound_type',  width:13 },
    { header:'From',            key:'outbound_from',  width:8  },
    { header:'To',              key:'outbound_to',    width:8  },
    { header:'Departure Date',  key:'outbound_date',  width:14 },
    { header:'Has Return',      key:'has_inbound',    width:10 },
    { header:'Inbound Type',    key:'inbound_type',   width:13 },
    { header:'Return From',     key:'inbound_from',   width:10 },
    { header:'Return To',       key:'inbound_to',     width:10 },
    { header:'Return Date',     key:'inbound_date',   width:12 },
    { header:'Passenger Name',  key:'passenger_name', width:24 },
    { header:'UID',             key:'uid',            width:14 },
    { header:'Sponsor UID',     key:'sponsor_uid',    width:14 },
    { header:'Category',        key:'category',       width:9  },
    { header:'Gender',          key:'gender',         width:8  },
    { header:'Date of Birth',   key:'date_of_birth',  width:14 },
    { header:'ID Type',         key:'id_type',        width:14 },
    { header:'ID Number',       key:'id_number',      width:18 },
    { header:'Contact Email',   key:'contact_email',  width:26 },
    { header:'Phone',           key:'phone',          width:16 },
    { header:'Booking Ref',     key:'booking_ref',    width:16 },
    { header:'Seat',            key:'seat_number',    width:8  },
    { header:'Booking Status',  key:'booking_status', width:14 },
  ];

  // Style header row
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1e3a5f' } };
  ws.getRow(1).alignment = { vertical:'middle', horizontal:'center' };
  ws.getRow(1).height = 22;

  rows.forEach(r => {
    const row = ws.addRow({
      ...r,
      submitted_at: r.submitted_at ? new Date(r.submitted_at).toLocaleString('id-ID') : '',
      outbound_date: r.outbound_date ? new Date(r.outbound_date).toLocaleDateString('id-ID') : '',
      inbound_date:  r.inbound_date  ? new Date(r.inbound_date).toLocaleDateString('id-ID')  : '',
      date_of_birth: r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('id-ID') : '',
      has_inbound:   r.has_inbound ? 'YES' : 'NO',
    });
    // Zebra stripe
    if (row.number % 2 === 0) {
      row.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF0F4FF' } };
    }
  });

  // Freeze header
  ws.views = [{ state:'frozen', ySplit:1 }];

  const filename = `YPJ_Travel_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
