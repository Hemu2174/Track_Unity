const express = require('express');
const router = express.Router();
const {
  createOpportunity,
  getAllOpportunities,
  getOpportunityById,
  deleteOpportunity,
} = require('../controllers/opportunityController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createOpportunity);
router.get('/', protect, getAllOpportunities);
router.get('/:id', protect, getOpportunityById);
router.delete('/:id', protect, deleteOpportunity);

module.exports = router;
