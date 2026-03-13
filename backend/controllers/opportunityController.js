const Opportunity = require('../models/Opportunity');
const { validateOpportunityLink } = require('../services/linkValidator');

// @desc    Get all opportunities
// @route   GET /api/opportunities
// @access  Private
const getAllOpportunities = async (req, res, next) => {
  try {
    const { domain, company, search } = req.query;
    const filter = { userId: req.user._id };

    if (domain) filter.domain = { $regex: domain, $options: 'i' };
    if (company) filter.company = { $regex: company, $options: 'i' };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const opportunities = await Opportunity.find(filter)
      .populate('sourceMessageId')
      .sort({ createdAt: -1 });

    res.status(200).json(opportunities);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single opportunity
// @route   GET /api/opportunities/:id
// @access  Private
const getOpportunityById = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('sourceMessageId');

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    res.status(200).json({ success: true, opportunity });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an opportunity
// @route   DELETE /api/opportunities/:id
// @access  Private
const deleteOpportunity = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    await opportunity.deleteOne();

    res.status(200).json({ success: true, message: 'Opportunity deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Re-check the link status of an opportunity
// @route   PATCH /api/opportunities/:id/revalidate-link
// @access  Private
const revalidateLink = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const { linkStatus, normalizedUrl, reason } = await validateOpportunityLink(opportunity.applicationLink);
    opportunity.linkStatus = linkStatus;
    if (normalizedUrl) opportunity.applicationLink = normalizedUrl;
    await opportunity.save();

    res.status(200).json({ success: true, linkStatus, reason, opportunity });
  } catch (error) {
    next(error);
  }
};

// @desc    Get opportunities sorted by nearest deadline (priority list)
// @route   GET /api/opportunities/priority
// @access  Private
const getPriorityOpportunities = async (req, res, next) => {
  try {
    const now = new Date();
    const opportunities = await Opportunity.find({
      userId: req.user._id,
      applicationStatus: { $in: ['not_applied', 'clicked_apply'] },
      deadline: { $gte: now },
    })
      .select('title company deadline applicationStatus clickedAt priorityRank')
      .sort({ deadline: 1 })
      .limit(10)
      .lean();

    res.status(200).json({ success: true, data: opportunities });
  } catch (error) {
    next(error);
  }
};

// @desc    Record that user clicked Apply (status → clicked_apply)
// @route   POST /api/opportunities/:id/click-apply
// @access  Private
const clickApply = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Only move forward — don't downgrade from 'applied'
    if (opportunity.applicationStatus === 'applied') {
      return res.status(200).json({ success: true, opportunity });
    }

    opportunity.applicationStatus = 'clicked_apply';
    opportunity.clickedAt = new Date();
    await opportunity.save();

    res.status(200).json({ success: true, opportunity });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm application submitted (status → applied)
// @route   POST /api/opportunities/:id/mark-applied
// @access  Private
const markApplied = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    opportunity.applicationStatus = 'applied';
    opportunity.appliedAt = new Date();
    await opportunity.save();

    res.status(200).json({ success: true, opportunity });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllOpportunities, getOpportunityById, deleteOpportunity, revalidateLink, clickApply, markApplied, getPriorityOpportunities };
