const UserProfile = require('../models/UserProfile');

// @desc    Save onboarding profile data
// @route   POST /api/profile/onboarding
// @access  Private
const saveOnboarding = async (req, res, next) => {
  try {
    const {
      userType,
      careerDomain,
      preferredRole,
      careerGoal,
      jobPreference,
      telegramUserId,
      skills,
      education,
    } = req.body;

    let profile = await UserProfile.findOne({ userId: req.user._id });

    if (profile) {
      // Update existing profile
      profile.userType = userType ?? profile.userType;
      profile.careerDomain = careerDomain ?? profile.careerDomain;
      profile.preferredRole = preferredRole ?? profile.preferredRole;
      profile.careerGoal = careerGoal ?? profile.careerGoal;
      profile.jobPreference = jobPreference ?? profile.jobPreference;
      profile.telegramUserId = telegramUserId ?? profile.telegramUserId;
      profile.skills = skills ?? profile.skills;
      profile.education = education ?? profile.education;
      profile.onboardingCompleted = true;
      await profile.save();
    } else {
      profile = await UserProfile.create({
        userId: req.user._id,
        userType,
        careerDomain,
        preferredRole,
        careerGoal,
        jobPreference,
        telegramUserId,
        skills,
        education,
        onboardingCompleted: true,
      });
    }

    res.status(200).json({ success: true, message: 'Onboarding saved', profile });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user's profile
// @route   GET /api/profile/me
// @access  Private
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user._id }).populate('userId', 'name email');

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found. Please complete onboarding.' });
    }

    res.status(200).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/profile/update
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'userType', 'careerDomain', 'preferredRole', 'careerGoal',
      'jobPreference', 'telegramUserId', 'skills', 'education',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({ success: true, message: 'Profile updated', profile });
  } catch (error) {
    next(error);
  }
};

module.exports = { saveOnboarding, getMyProfile, updateProfile };
