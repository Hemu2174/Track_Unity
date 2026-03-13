const express = require('express');
const {
  getAllOpportunities,
  getOpportunityById,
  deleteOpportunity,
  revalidateLink,
  clickApply,
  markApplied,
  getPriorityOpportunities,
} = require('../controllers/opportunityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getAllOpportunities);
router.get('/priority', protect, getPriorityOpportunities);
router.get('/:id', protect, getOpportunityById);
router.delete('/:id', protect, deleteOpportunity);
router.patch('/:id/revalidate-link', protect, revalidateLink);
router.post('/:id/click-apply', protect, clickApply);
router.post('/:id/mark-applied', protect, markApplied);

module.exports = router;
