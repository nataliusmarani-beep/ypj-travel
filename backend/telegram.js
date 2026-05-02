const TelegramBot = require('node-telegram-bot-api');

let bot = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
}

// Notify all PIC Travel + Manager users
async function notifyPIC(message) {
  if (!bot) return;
  try {
    const { pool } = require('./db');
    const { rows } = await pool.query(
      `SELECT telegram_chat_id FROM users WHERE role IN ('PIC Travel','Manager') AND telegram_chat_id IS NOT NULL AND is_active=true`
    );
    for (const u of rows) {
      await bot.sendMessage(u.telegram_chat_id, message, { parse_mode:'HTML' });
    }
  } catch {}
}

// Notify a specific user by email
async function notifyUser(email, message) {
  if (!bot) return;
  try {
    const { pool } = require('./db');
    const { rows } = await pool.query(
      `SELECT telegram_chat_id FROM users WHERE email=$1 AND telegram_chat_id IS NOT NULL`, [email]
    );
    if (rows[0]) await bot.sendMessage(rows[0].telegram_chat_id, message, { parse_mode:'HTML' });
  } catch {}
}

// Webhook handler for /start command
async function handleWebhook(req, res) {
  if (!bot) return res.json({ ok: true });
  const body = req.body;
  if (body?.message?.text?.startsWith('/start')) {
    const chatId = body.message.chat.id;
    const name   = body.message.from?.first_name || 'there';
    await bot.sendMessage(chatId,
      `👋 <b>Welcome to YPJ Travel Bot!</b>\n\nYour Chat ID is: <code>${chatId}</code>\n\n` +
      `Go to: travel.ypj.sch.id → click your avatar → My Profile → paste this ID → Save.`,
      { parse_mode:'HTML' }
    );
  }
  res.json({ ok: true });
}

async function registerWebhook(frontendUrl) {
  if (!bot || !process.env.TELEGRAM_BOT_TOKEN) return;
  const webhookUrl = `${frontendUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  try {
    await bot.setWebHook(webhookUrl);
    console.log('[telegram] Webhook set:', webhookUrl);
  } catch (e) {
    console.error('[telegram] Webhook failed:', e.message);
  }
}

module.exports = { notifyPIC, notifyUser, handleWebhook, registerWebhook };
