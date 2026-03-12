const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
    },
    role: { type: String, trim: true },
    domain: { type: String, trim: true },
    eligibility: { type: String, trim: true },
    deadline: { type: Date },
    applicationLink: { type: String, trim: true },
    description: { type: String, trim: true },
    sourceMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMessage',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
