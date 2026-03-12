const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  ingestText,
  ingestImage,
  ingestTelegram,
} = require('../controllers/ingestionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post('/text', protect, ingestText);
router.post('/image', protect, upload.single('image'), ingestImage);
router.post('/telegram', ingestTelegram);

module.exports = router;
