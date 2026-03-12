const express = require('express');
const {
  getAllOpportunities,
  getOpportunityById,
  deleteOpportunity,
} = require('../controllers/opportunityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getAllOpportunities);
router.get('/:id', protect, getOpportunityById);
router.delete('/:id', protect, deleteOpportunity);

module.exports = router;
