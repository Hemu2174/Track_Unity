const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema(
  {
    course: { type: String, trim: true },
    specialization: { type: String, trim: true },
    university: { type: String, trim: true },
    graduationYear: { type: Number },
  },
  { _id: false }
);

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    userType: { type: String, trim: true },
    careerDomain: { type: String, trim: true },
    preferredRole: { type: String, trim: true },
    careerGoal: { type: String, trim: true },
    jobPreference: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    education: [educationSchema],
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProfile', userProfileSchema);
