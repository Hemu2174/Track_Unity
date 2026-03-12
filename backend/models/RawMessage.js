const mongoose = require('mongoose');

const rawMessageSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['dashboard', 'telegram', 'email', 'image'],
      required: true,
    },
    messageText: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    telegramUserId: {
      type: String,
      trim: true,
      default: null,
    },
    processed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('RawMessage', rawMessageSchema);
