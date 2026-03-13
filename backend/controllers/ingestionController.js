const fs = require('fs');
const Opportunity = require('../models/Opportunity');
const RawMessage = require('../models/RawMessage');
const UserProfile = require('../models/UserProfile');
const { extractTextFromImage } = require('../services/ocrService');
const { extractOpportunityWithNlp } = require('../services/nlpClientService');
const { validateOpportunityLink } = require('../services/linkValidator');
const { updateRecommendationsForOpportunity } = require('../services/recommendationService');
const { assessOpportunityRisk } = require('../services/fakeDetector');
const {
  normalizeTelegramWebhookPayload,
  isTelegramWebhookAuthorized,
  sendTelegramMessage,
} = require('../services/telegramBotService');

const resolveUserIdFromTelegram = async (telegramUserId) => {
  if (!telegramUserId) {
    return null;
  }

  const profile = await UserProfile.findOne({ telegramUserId: String(telegramUserId) })
    .select('userId')
    .lean();

  return profile?.userId || null;
};

const persistParsedOpportunity = async ({
  source,
  messageText,
  imageUrl = null,
  telegramUserId = null,
  userId = null,
}) => {
  const rawMessage = await RawMessage.create({
    source,
    messageText,
    imageUrl,
    telegramUserId,
    userId,
    processed: false,
  });

  const parsed = await extractOpportunityWithNlp(messageText);
  const linkResult = await validateOpportunityLink(parsed.applicationLink);
  const riskResult = await assessOpportunityRisk({
    title: parsed.title,
    company: parsed.company,
    text: messageText,
    applicationLink: linkResult.normalizedUrl || parsed.applicationLink,
  });

  const normalizedCompany = parsed.company || 'Unknown Company';
  const normalizedTitle = parsed.title && parsed.title !== 'Opportunity'
    ? parsed.title
    : `${normalizedCompany} Opportunity`;

  const opportunity = await Opportunity.create({
    title: normalizedTitle,
    company: normalizedCompany,
    role: parsed.role,
    eligibility: parsed.eligibility,
    deadline: parsed.deadline ? new Date(parsed.deadline) : null,
    skills: parsed.skills || [],
    applicationLink: linkResult.normalizedUrl || parsed.applicationLink,
    linkStatus: linkResult.linkStatus,
    riskLevel: riskResult.riskLevel,
    confidenceScore: parsed.confidenceScore || 0,
    description: parsed.description,
    userId,
    sourceMessageId: rawMessage._id,
  });

  rawMessage.processed = true;
  await rawMessage.save();

  setImmediate(() => {
    updateRecommendationsForOpportunity(opportunity, userId)
      .catch((error) => {
        console.error(`Recommendation update failed: ${error.message}`);
      });
  });

  return { rawMessage, parsed, opportunity };
};

const ingestText = async (req, res, next) => {
  try {
    const rawBody = req.body || {};
    const message = rawBody.message || rawBody.text || rawBody.messageText;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A non-empty message is required' });
    }

    const result = await persistParsedOpportunity({
      source: 'dashboard',
      messageText: message,
      userId: req.user?._id || null,
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
      userId: req.user?._id || null,
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
    const hasRawTelegramUpdate = Boolean(req.body?.message || req.body?.edited_message);

    if (hasRawTelegramUpdate && !isTelegramWebhookAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Invalid Telegram webhook secret' });
    }

    let messageText = req.body?.messageText;
    let telegramUserId = req.body?.telegramUserId ? String(req.body.telegramUserId) : null;
    let telegramChatId = req.body?.telegramChatId ? String(req.body.telegramChatId) : null;

    if (hasRawTelegramUpdate) {
      const normalized = normalizeTelegramWebhookPayload(req.body);
      messageText = normalized.messageText;
      telegramUserId = normalized.telegramUserId;
      telegramChatId = normalized.telegramChatId;
    }

    if (!messageText) {
      return res.status(200).json({ success: true, message: 'Telegram update ignored: no text content' });
    }

    const resolvedUserId = await resolveUserIdFromTelegram(telegramUserId);

    const result = await persistParsedOpportunity({
      source: 'telegram',
      messageText,
      telegramUserId,
      userId: resolvedUserId,
    });

    if (hasRawTelegramUpdate && telegramChatId) {
      void sendTelegramMessage(telegramChatId, 'Opportunity received and added to your dashboard.')
        .catch((error) => {
          console.error(`Telegram acknowledgement failed: ${error.message}`);
        });
    }

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
