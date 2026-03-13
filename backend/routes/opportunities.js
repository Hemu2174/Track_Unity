const express = require('express');
const router = express.Router();
const {
  getAllOpportunities,
  getOpportunityById,
  deleteOpportunity,
  revalidateLink,
} = require('../controllers/opportunityController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllOpportunities);
router.get('/:id', protect, getOpportunityById);
router.delete('/:id', protect, deleteOpportunity);
router.patch('/:id/revalidate-link', protect, revalidateLink);

module.exports = router;
