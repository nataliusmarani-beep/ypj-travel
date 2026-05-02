const { pool } = require('./db');
const { sendDepartureReminder, sendRTIDeadlineReminder } = require('./mailer');

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function runReminders() {
  // ── Departure reminders (7 days and 2 days before) ──────────────────────
  for (const daysLeft of [7, 2]) {
    const targetDate = daysFromNow(daysLeft);
    const { rows } = await pool.query(`
      SELECT tr.* FROM travel_requests tr
      WHERE tr.status IN ('booked','confirmed')
        AND tr.outbound_date::text = $1
        AND NOT EXISTS (
          SELECT 1 FROM reminders_log rl
          WHERE rl.type = $2 AND rl.target_id = tr.id
        )
    `, [targetDate, `departure_${daysLeft}d`]);

    for (const req of rows) {
      try {
        await sendDepartureReminder({ request: req, daysLeft });
        await pool.query(
          `INSERT INTO reminders_log (type,target_id,recipient_email) VALUES ($1,$2,$3)`,
          [`departure_${daysLeft}d`, req.id, req.submitter_email]
        );
      } catch (e) {
        console.error(`[reminders] departure_${daysLeft}d failed for request ${req.id}:`, e.message);
      }
    }
  }

  // ── RTI deadline reminders (3 days and 1 day before) ────────────────────
  for (const daysLeft of [3, 1]) {
    const targetDate = daysFromNow(daysLeft);
    const { rows: events } = await pool.query(`
      SELECT * FROM rti_events
      WHERE status='open' AND deadline::date::text = $1
    `, [targetDate]);

    for (const event of events) {
      // Find staff who haven't submitted for this event
      const { rows: staffWithoutSubmission } = await pool.query(`
        SELECT u.name, u.email FROM users u
        WHERE u.role = 'Staff' AND u.is_active = true
          AND u.id NOT IN (
            SELECT tr.submitter_id FROM travel_requests tr
            WHERE tr.rti_event_id = $1
          )
          AND NOT EXISTS (
            SELECT 1 FROM reminders_log rl
            WHERE rl.type = $2 AND rl.target_id = $1 AND rl.recipient_email = u.email
          )
      `, [event.id, `rti_deadline_${daysLeft}d`]);

      for (const user of staffWithoutSubmission) {
        try {
          await sendRTIDeadlineReminder({ event, user, daysLeft });
          await pool.query(
            `INSERT INTO reminders_log (type,target_id,recipient_email) VALUES ($1,$2,$3)`,
            [`rti_deadline_${daysLeft}d`, event.id, user.email]
          );
        } catch (e) {
          console.error(`[reminders] rti_deadline_${daysLeft}d failed for ${user.email}:`, e.message);
        }
      }
    }
  }

  console.log('[reminders] Run complete.');
}

module.exports = { runReminders };
