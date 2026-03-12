const Opportunity = require('../models/Opportunity');

// @desc    Get all opportunities
// @route   GET /api/opportunities
// @access  Private
const getAllOpportunities = async (req, res, next) => {
  try {
    const { domain, company, search } = req.query;
    const filter = {};

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

    res.status(200).json({ success: true, count: opportunities.length, opportunities });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single opportunity
// @route   GET /api/opportunities/:id
// @access  Private
const getOpportunityById = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id).populate('sourceMessageId');

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
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    await opportunity.deleteOne();

    res.status(200).json({ success: true, message: 'Opportunity deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllOpportunities, getOpportunityById, deleteOpportunity };
