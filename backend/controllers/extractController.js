const { parseOpportunity } = require('../services/opportunityParser');

// @desc    Extract opportunity fields from raw message text
// @route   POST /api/extract-opportunity
// @access  Private
const extractOpportunity = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'A non-empty "message" string is required' });
    }

    const extracted = parseOpportunity(message);

    res.status(200).json({
      success: true,
      extracted,
      note: 'Review extracted fields before saving as an opportunity.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { extractOpportunity };
