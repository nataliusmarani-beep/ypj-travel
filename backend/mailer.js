const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const APP_URL    = process.env.FRONTEND_URL || 'https://travel.ypj.sch.id';
const APP_NAME   = 'YPJ Travel';
const FROM       = `"${APP_NAME}" <${process.env.EMAIL_USER}>`;

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f8fafc; padding: 32px 0;
`;
const CARD = `
  background: white; border-radius: 12px; padding: 32px;
  max-width: 560px; margin: 0 auto; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
`;
const HEADER = `
  background: #1e3a5f; color: white; border-radius: 8px;
  padding: 16px 20px; margin-bottom: 24px;
  font-size: 18px; font-weight: 700;
`;
const BTN = `
  display: inline-block; background: #2563eb; color: white !important;
  padding: 12px 28px; border-radius: 8px; text-decoration: none;
  font-weight: 700; font-size: 14px; margin-top: 16px;
`;

// ── Welcome email ──────────────────────────────────────────────────────────
async function sendWelcomeEmail({ name, email, token }) {
  const link = `${APP_URL}/set-password?token=${token}`;
  await transporter.sendMail({
    from, to: email,
    subject: `Welcome to ${APP_NAME} — Set Your Password`,
    html: `<div style="${BASE_STYLE}"><div style="${CARD}">
      <div style="${HEADER}">✈️ Welcome to ${APP_NAME}</div>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account has been created. Click the button below to set your password and get started.</p>
      <p><a href="${link}" style="${BTN}">🔐 Set My Password</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">Link expires in 72 hours. If expired, ask your Manager to resend.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
      <p style="font-size:12px;color:#6b7280;">
        📱 <strong>Install as App:</strong><br>
        Android: Chrome ⋮ menu → "Add to Home Screen"<br>
        iPhone: Safari Share → "Add to Home Screen"
      </p>
    </div></div>`,
  });
}

async function sendWelcomeEmailWithPassword({ name, email, password }) {
  await transporter.sendMail({
    from, to: email,
    subject: `Welcome to ${APP_NAME} — Your Account is Ready`,
    html: `<div style="${BASE_STYLE}"><div style="${CARD}">
      <div style="${HEADER}">✈️ Welcome to ${APP_NAME}</div>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account has been created by your Manager. Use the credentials below to sign in.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px 12px;background:#f8fafc;border-radius:6px;font-weight:600;width:140px">Login URL</td>
            <td style="padding:8px 12px"><a href="${APP_URL}">${APP_URL}</a></td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Email</td>
            <td style="padding:8px 12px">${email}</td></tr>
        <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600">Password</td>
            <td style="padding:8px 12px;font-family:monospace;letter-spacing:1px">${password}</td></tr>
      </table>
      <p style="color:#dc2626;font-size:12px;">⚠️ Please change your password after first login via your profile settings.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
      <p style="font-size:12px;color:#6b7280;">
        📱 <strong>Install as App:</strong><br>
        Android: Chrome ⋮ menu → "Add to Home Screen"<br>
        iPhone: Safari Share → "Add to Home Screen"
      </p>
    </div></div>`,
  });
}

// ── New request notification to PIC Travel ────────────────────────────────
async function sendRequestNotification(request, passengers) {
  const { rows: pics } = await require('./db').pool.query(
    `SELECT email FROM users WHERE role IN ('PIC Travel','Manager') AND is_active=true`
  );
  const pList = passengers.map(p =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${p.passenger_name}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${p.uid}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${p.category}</td></tr>`
  ).join('');

  const html = `<div style="${BASE_STYLE}"><div style="${CARD}">
    <div style="${HEADER}">✈️ New Travel Request #${request.id}</div>
    <p><strong>From:</strong> ${request.submitter_name} (${request.submitter_email})</p>
    <p><strong>Purpose:</strong> ${request.travel_purpose} &nbsp;|&nbsp; <strong>Transport:</strong> ${request.transport_type}</p>
    <p><strong>Route:</strong> ${request.outbound_from||'?'} → ${request.outbound_to||'?'} on ${request.outbound_date||'?'}</p>
    ${request.has_inbound ? `<p><strong>Return:</strong> ${request.inbound_from||'?'} → ${request.inbound_to||'?'} on ${request.inbound_date||'?'}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
      <tr style="background:#f1f5f9">
        <th style="padding:8px 10px;text-align:left">Passenger</th>
        <th style="padding:8px 10px;text-align:left">UID</th>
        <th style="padding:8px 10px;text-align:left">Category</th>
      </tr>
      ${pList}
    </table>
    <a href="${APP_URL}/requests/${request.id}" style="${BTN}">👁 View Request</a>
  </div></div>`;

  for (const pic of pics) {
    await transporter.sendMail({ from: FROM, to: pic.email, subject: `[YPJ Travel] New Request #${request.id} — ${request.submitter_name}`, html });
  }
}

// ── Booking / status notification to submitter ────────────────────────────
async function sendBookingNotification(request, passengers, status) {
  const statusLabel = { booked:'Ticket Booked', confirmed:'Confirmed', cancelled:'Cancelled', awaiting_payment:'Awaiting Payment' }[status] || status;
  const color       = status === 'confirmed' ? '#15803d' : status === 'cancelled' ? '#b91c1c' : '#1e40af';

  const pList = passengers.map(p =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${p.passenger_name}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${p.uid}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${p.booking_ref||'—'}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${p.seat_number||'—'}</td></tr>`
  ).join('');

  await transporter.sendMail({
    from: FROM,
    to: request.submitter_email,
    subject: `[YPJ Travel] Request #${request.id} — ${statusLabel}`,
    html: `<div style="${BASE_STYLE}"><div style="${CARD}">
      <div style="${HEADER}">✈️ Travel Request Update</div>
      <p>Hi <strong>${request.submitter_name}</strong>,</p>
      <p>Your travel request <strong>#${request.id}</strong> status is now:
         <strong style="color:${color}">${statusLabel}</strong></p>
      ${request.pic_notes ? `<p><strong>Note from PIC Travel:</strong> ${request.pic_notes}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
        <tr style="background:#f1f5f9">
          <th style="padding:8px 10px;text-align:left">Passenger</th>
          <th style="padding:8px 10px;text-align:left">UID</th>
          <th style="padding:8px 10px;text-align:left">Booking Ref</th>
          <th style="padding:8px 10px;text-align:left">Seat</th>
        </tr>
        ${pList}
      </table>
      <a href="${APP_URL}/my-requests" style="${BTN}">📋 View My Requests</a>
    </div></div>`,
  });
}

// ── RTI Announcement ──────────────────────────────────────────────────────
async function sendRTIAnnouncement({ event, user }) {
  const deadline = new Date(event.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: `[YPJ Travel] RTI Open: ${event.name}`,
    html: `<div style="${BASE_STYLE}"><div style="${CARD}">
      <div style="${HEADER}">📢 RTI Travel Open: ${event.name}</div>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>${event.description || `Travel booking for <strong>${event.name}</strong> is now open.`}</p>
      <p>⏰ <strong>Deadline to submit:</strong> ${deadline}</p>
      <p style="color:#b91c1c;font-size:13px">The form will be automatically locked after the deadline.</p>
      <a href="${APP_URL}/rti" style="${BTN}">📋 Submit RTI Form</a>
    </div></div>`,
  });
}

// ── Departure reminder ─────────────────────────────────────────────────────
async function sendDepartureReminder({ request, daysLeft }) {
  const urgency = daysLeft <= 2 ? '#b91c1c' : '#92400e';
  await transporter.sendMail({
    from: FROM,
    to: request.submitter_email,
    subject: `[YPJ Travel] ⏰ Departure in ${daysLeft} day${daysLeft>1?'s':''} — Request #${request.id}`,
    html: `<div style="${BASE_STYLE}"><div style="${CARD}">
      <div style="${HEADER}">⏰ Departure Reminder</div>
      <p>Hi <strong>${request.submitter_name}</strong>,</p>
      <p style="color:${urgency}">Your trip is in <strong>${daysLeft} day${daysLeft>1?'s':''}</strong>!</p>
      <p><strong>Route:</strong> ${request.outbound_from} → ${request.outbound_to}</p>
      <p><strong>Date:</strong> ${new Date(request.outbound_date).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      <a href="${APP_URL}/my-requests" style="${BTN}">📋 View Trip Details</a>
    </div></div>`,
  });
}

// ── RTI deadline reminder ──────────────────────────────────────────────────
async function sendRTIDeadlineReminder({ event, user, daysLeft }) {
  const deadline = new Date(event.deadline).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: `[YPJ Travel] ⚠️ RTI Deadline in ${daysLeft} day${daysLeft>1?'s':''} — ${event.name}`,
    html: `<div style="${BASE_STYLE}"><div style="${CARD}">
      <div style="${HEADER}">⚠️ RTI Submission Deadline Approaching</div>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>You have <strong style="color:#b91c1c">${daysLeft} day${daysLeft>1?'s':''}</strong> left to submit your RTI form for:</p>
      <p style="font-size:16px;font-weight:700">${event.name}</p>
      <p>⏰ Deadline: <strong>${deadline}</strong></p>
      <p>The form will lock automatically after the deadline.</p>
      <a href="${APP_URL}/rti" style="${BTN}">📋 Submit Now</a>
    </div></div>`,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendWelcomeEmailWithPassword,
  sendRequestNotification,
  sendBookingNotification,
  sendRTIAnnouncement,
  sendDepartureReminder,
  sendRTIDeadlineReminder,
};
