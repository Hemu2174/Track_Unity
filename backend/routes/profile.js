const express = require('express');
const router = express.Router();
const { saveOnboarding, getMyProfile, updateProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

router.post('/onboarding', protect, saveOnboarding);
router.get('/me', protect, getMyProfile);
router.put('/update', protect, updateProfile);

module.exports = router;
