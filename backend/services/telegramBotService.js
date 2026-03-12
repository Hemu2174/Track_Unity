const axios = require('axios');

const normalizeTelegramWebhookPayload = (payload = {}) => {
  const message = payload.message || payload.edited_message || {};

  return {
    messageText: message.text || message.caption || '',
    telegramUserId: message.from?.id ? String(message.from.id) : null,
    telegramChatId: message.chat?.id ? String(message.chat.id) : null,
    telegramMessageId: message.message_id ? String(message.message_id) : null,
  };
};

const isTelegramWebhookAuthorized = (req) => {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  return req.headers['x-telegram-bot-api-secret-token'] === process.env.TELEGRAM_WEBHOOK_SECRET;
};

const initializeTelegramBot = async () => {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_URL, TELEGRAM_WEBHOOK_SECRET } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_URL) {
    console.log('Telegram bot initialization skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_URL');
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      url: TELEGRAM_WEBHOOK_URL,
      secret_token: TELEGRAM_WEBHOOK_SECRET || undefined,
    });
    console.log('Telegram webhook configured successfully');
  } catch (error) {
    console.error(`Telegram webhook setup failed: ${error.message}`);
  }
};

module.exports = {
  normalizeTelegramWebhookPayload,
  isTelegramWebhookAuthorized,
  initializeTelegramBot,
};
