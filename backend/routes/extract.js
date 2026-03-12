const express = require('express');
const router = express.Router();
const { extractOpportunity } = require('../controllers/extractController');
const { protect } = require('../middleware/auth');

router.post('/', protect, extractOpportunity);

module.exports = router;
