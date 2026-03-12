const express = require('express');
const { saveOnboarding, getMyProfile, updateProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/onboarding', protect, saveOnboarding);
router.get('/me', protect, getMyProfile);
router.put('/update', protect, updateProfile);

module.exports = router;
