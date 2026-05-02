require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── Schema bootstrap ──────────────────────────────────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                     SERIAL PRIMARY KEY,
        name                   TEXT NOT NULL,
        email                  TEXT NOT NULL UNIQUE,
        role                   TEXT NOT NULL DEFAULT 'Staff'
                               CHECK(role IN ('Manager','PIC Travel','Staff')),
        employee_id            TEXT,
        unit                   TEXT NOT NULL DEFAULT 'All',
        is_active              BOOLEAN NOT NULL DEFAULT true,
        password_hash          TEXT NOT NULL,
        telegram_chat_id       TEXT,
        password_reset_token   TEXT,
        password_reset_expires TIMESTAMPTZ,
        created_at             TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rti_events (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        open_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deadline    TIMESTAMPTZ NOT NULL,
        status      TEXT NOT NULL DEFAULT 'open'
                    CHECK(status IN ('open','closed','cancelled')),
        routes      JSONB DEFAULT '[]',
        created_by  INTEGER REFERENCES users(id),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS travel_requests (
        id              SERIAL PRIMARY KEY,
        request_type    TEXT NOT NULL DEFAULT 'regular'
                        CHECK(request_type IN ('regular','rti')),
        rti_event_id    INTEGER REFERENCES rti_events(id),
        submitter_id    INTEGER REFERENCES users(id),
        submitter_name  TEXT NOT NULL,
        submitter_email TEXT NOT NULL,
        travel_purpose  TEXT NOT NULL
                        CHECK(travel_purpose IN ('VAC','EMG','MED','COBUS','FAMILY','OTHER')),
        transport_type  TEXT NOT NULL DEFAULT 'plane'
                        CHECK(transport_type IN ('plane','bus','both')),
        payment_method  TEXT
                        CHECK(payment_method IN ('Cash','Travel Benefit','Cobus','Emergency','Medical','')),
        outbound_type   TEXT CHECK(outbound_type IN ('DOM','INT')),
        outbound_from   TEXT,
        outbound_to     TEXT,
        outbound_date   DATE,
        has_inbound     BOOLEAN NOT NULL DEFAULT false,
        inbound_type    TEXT CHECK(inbound_type IN ('DOM','INT')),
        inbound_from    TEXT,
        inbound_to      TEXT,
        inbound_date    DATE,
        status          TEXT NOT NULL DEFAULT 'submitted'
                        CHECK(status IN ('submitted','processing','booked','awaiting_payment','confirmed','cancelled')),
        notes           TEXT,
        pic_notes       TEXT,
        submitted_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS passengers (
        id              SERIAL PRIMARY KEY,
        request_id      INTEGER NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
        passenger_name  TEXT NOT NULL,
        uid             TEXT NOT NULL,
        sponsor_uid     TEXT,
        category        TEXT NOT NULL DEFAULT 'EMP'
                        CHECK(category IN ('EMP','DPN')),
        gender          TEXT CHECK(gender IN ('MALE','FEMALE')),
        date_of_birth   DATE,
        id_type         TEXT CHECK(id_type IN ('KTP','Employee ID','Dependent ID','')),
        id_number       TEXT,
        contact_email   TEXT,
        phone           TEXT,
        booking_ref     TEXT,
        seat_number     TEXT,
        booking_status  TEXT NOT NULL DEFAULT 'pending'
                        CHECK(booking_status IN ('pending','booked','cancelled'))
      );

      CREATE TABLE IF NOT EXISTS flight_schedules (
        id              SERIAL PRIMARY KEY,
        airline         TEXT NOT NULL,
        flight_type     TEXT NOT NULL DEFAULT 'Commercial'
                        CHECK(flight_type IN ('Charter','Commercial')),
        flight_number   TEXT,
        from_airport    TEXT NOT NULL,
        to_airport      TEXT NOT NULL,
        departure_date  DATE NOT NULL,
        departure_time  TIME,
        arrival_time    TIME,
        available_seats INTEGER,
        notes           TEXT,
        created_by      INTEGER REFERENCES users(id),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reminders_log (
        id              SERIAL PRIMARY KEY,
        type            TEXT NOT NULL,
        target_id       INTEGER,
        recipient_email TEXT,
        sent_at         TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dependents (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prefix       TEXT CHECK(prefix IN ('Mr','Mrs','Master','Miss')),
        name         TEXT NOT NULL,
        dependent_id TEXT,
        age          INTEGER,
        gender       TEXT CHECK(gender IN ('MALE','FEMALE')),
        relation     TEXT NOT NULL
                     CHECK(relation IN ('Spouse','Child','Mother','Father',
                                        'Mother in Law','Father in Law','Assistance')),
        ktp_number   TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Migrate: add campus_location to users if missing
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_location TEXT;
    `);

    // Seed first Manager if no users exist
    const { rows } = await client.query('SELECT COUNT(*) AS n FROM users');
    if (parseInt(rows[0].n) === 0) {
      const bcrypt = require('bcryptjs');
      const hash   = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'YPJ2025', 10);
      await client.query(`
        INSERT INTO users (name, email, role, unit, password_hash)
        VALUES ('Natalius Fillep Marani', 'nmarani@fmi.com', 'Manager', 'All', $1)
      `, [hash]);
      console.log('[db] First-run seed: Manager account created.');
    }

    console.log('[db] Schema ready.');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
