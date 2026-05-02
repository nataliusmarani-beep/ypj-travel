require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');
const { initDB }   = require('./db');
const requireAuth  = require('./middleware/auth');
const { handleWebhook, registerWebhook } = require('./telegram');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Rate limiters
const loginLimiter = rateLimit({ windowMs:15*60*1000, max:10, message:{ error:'Too many login attempts.' } });
const apiLimiter   = rateLimit({ windowMs:60*1000,    max:300, message:{ error:'Too many requests.' } });

app.use('/api/auth/login', loginLimiter);
app.use('/api',            apiLimiter);

// Telegram webhook (public)
app.post('/api/telegram/webhook', handleWebhook);

// Auth routes (public for login / set-password)
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/users',    requireAuth, require('./routes/users'));
app.use('/api/requests', requireAuth, require('./routes/requests'));
app.use('/api/rti',      requireAuth, require('./routes/rti'));
app.use('/api/flights',  requireAuth, require('./routes/flights'));
app.use('/api/export',   requireAuth, require('./routes/export'));

// Serve React frontend in production
const DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*$/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3002;

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

    // Reminders: run on startup + every hour
    const { runReminders } = require('./reminders');
    runReminders().catch(e => console.error('[reminders] Startup run failed:', e.message));
    setInterval(() => {
      runReminders().catch(e => console.error('[reminders] Hourly run failed:', e.message));
    }, 60 * 60 * 1000);

    // Register Telegram webhook in production
    if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
      registerWebhook(process.env.FRONTEND_URL);
    }
  })
  .catch(e => {
    console.error('[db] Failed to initialise:', e.message);
    process.exit(1);
  });
