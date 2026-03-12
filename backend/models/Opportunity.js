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
    skills: [{ type: String, trim: true }],
    applicationLink: { type: String, trim: true },
    linkStatus: {
      type: String,
      enum: ['valid', 'suspicious', 'broken'],
      default: 'broken',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    confidenceScore: { type: Number, default: 0 },
    description: { type: String, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sourceMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMessage',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
