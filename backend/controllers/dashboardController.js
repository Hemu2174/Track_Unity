const Opportunity = require('../models/Opportunity');

// @desc    Get dashboard summary
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [totalOpportunities, upcomingDeadlines, recentOpportunities] = await Promise.all([
      // Total count
      Opportunity.countDocuments(),

      // Deadlines within the next 7 days
      Opportunity.find({
        deadline: { $gte: now, $lte: sevenDaysFromNow },
      })
        .select('title company deadline applicationLink')
        .sort({ deadline: 1 })
        .limit(10),

      // Most recently added opportunities
      Opportunity.find()
        .select('title company role domain deadline sourceMessageId createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        totalOpportunities,
        upcomingDeadlines,
        recentOpportunities,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
