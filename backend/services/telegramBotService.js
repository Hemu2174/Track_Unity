const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

let botInstance = null;

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
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_TOKEN, TELEGRAM_WEBHOOK_URL, TELEGRAM_WEBHOOK_SECRET } = process.env;
  const token = TELEGRAM_TOKEN || TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log('Telegram bot initialization skipped: missing TELEGRAM_TOKEN');
    return;
  }

  if (botInstance) {
    return;
  }

  const ingestionUrl = process.env.TELEGRAM_INGEST_URL || 'http://localhost:5000/api/ingest/telegram';

  botInstance = new TelegramBot(token, { polling: true });

  botInstance.on('message', async (msg) => {
    const text = msg?.text;
    if (!text) {
      return;
    }

    try {
      await axios.post(ingestionUrl, {
        source: 'telegram',
        messageText: text,
        telegramUserId: msg.from?.id,
      }, {
        timeout: Number(process.env.TELEGRAM_FORWARD_TIMEOUT_MS) || 10000,
      });

      if (msg.chat?.id) {
        await botInstance.sendMessage(msg.chat.id, 'Opportunity received and added to your dashboard.');
      }
    } catch (error) {
      console.error(`Telegram forward failed: ${error.message}`);
    }
  });

  botInstance.on('polling_error', (error) => {
    console.error(`Telegram polling error: ${error.message}`);
  });

  // Optional webhook registration is kept for deployments that use webhook mode.
  if (TELEGRAM_WEBHOOK_URL) {
    try {
      await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
        url: TELEGRAM_WEBHOOK_URL,
        secret_token: TELEGRAM_WEBHOOK_SECRET || undefined,
      });
      console.log('Telegram webhook configured successfully');
    } catch (error) {
      console.error(`Telegram webhook setup failed: ${error.message}`);
    }
  }

  console.log('Telegram bot polling started');
};

module.exports = {
  normalizeTelegramWebhookPayload,
  isTelegramWebhookAuthorized,
  initializeTelegramBot,
};
