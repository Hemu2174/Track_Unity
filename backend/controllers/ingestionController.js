const fs = require('fs');
const Opportunity = require('../models/Opportunity');
const RawMessage = require('../models/RawMessage');
const { extractTextFromImage } = require('../services/ocrService');
const { parseOpportunityMessage } = require('../services/nlpParserService');
const {
  normalizeTelegramWebhookPayload,
  isTelegramWebhookAuthorized,
} = require('../services/telegramBotService');

const persistParsedOpportunity = async ({ source, messageText, imageUrl = null, telegramUserId = null }) => {
  const rawMessage = await RawMessage.create({
    source,
    messageText,
    imageUrl,
    telegramUserId,
    processed: false,
  });

  const parsed = parseOpportunityMessage(messageText);
  const normalizedCompany = parsed.company || 'Unknown Company';
  const normalizedTitle = parsed.title && parsed.title !== 'Opportunity'
    ? parsed.title
    : `${normalizedCompany} Opportunity`;

  const opportunity = await Opportunity.create({
    title: normalizedTitle,
    company: normalizedCompany,
    role: parsed.role,
    domain: parsed.domain,
    eligibility: parsed.eligibility,
    deadline: parsed.deadline,
    applicationLink: parsed.applicationLink,
    description: parsed.description,
    sourceMessageId: rawMessage._id,
  });

  rawMessage.processed = true;
  await rawMessage.save();

  return { rawMessage, parsed, opportunity };
};

const ingestText = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A non-empty message is required' });
    }

    const result = await persistParsedOpportunity({
      source: 'dashboard',
      messageText: message,
    });

    return res.status(201).json({
      success: true,
      message: 'Text message ingested successfully',
      rawMessage: result.rawMessage,
      extracted: result.parsed,
      opportunity: result.opportunity,
    });
  } catch (error) {
    return next(error);
  }
};

const ingestImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image upload is required' });
    }

    const extractedText = await extractTextFromImage(req.file.path);
    if (!extractedText) {
      return res.status(400).json({ success: false, message: 'No readable text found in image' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const result = await persistParsedOpportunity({
      source: 'image',
      messageText: extractedText,
      imageUrl,
    });

    return res.status(201).json({
      success: true,
      message: 'Image ingested successfully',
      imageUrl,
      rawMessage: result.rawMessage,
      extracted: result.parsed,
      opportunity: result.opportunity,
    });
  } catch (error) {
    return next(error);
  }
};

const ingestTelegram = async (req, res, next) => {
  try {
    if (!isTelegramWebhookAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Invalid Telegram webhook secret' });
    }

    const { messageText, telegramUserId } = normalizeTelegramWebhookPayload(req.body);
    if (!messageText) {
      return res.status(200).json({ success: true, message: 'Telegram update ignored: no text content' });
    }

    const result = await persistParsedOpportunity({
      source: 'telegram',
      messageText,
      telegramUserId,
    });

    return res.status(201).json({
      success: true,
      message: 'Telegram message ingested successfully',
      rawMessage: result.rawMessage,
      extracted: result.parsed,
      opportunity: result.opportunity,
    });
  } catch (error) {
    return next(error);
  }
};

const cleanupUploadedFile = (req, res, next) => {
  res.on('finish', () => {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      return;
    }
  });
  next();
};

module.exports = {
  ingestText,
  ingestImage,
  ingestTelegram,
  cleanupUploadedFile,
};
