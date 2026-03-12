const Opportunity = require('../models/Opportunity');
const UserProfile = require('../models/UserProfile');
const OpportunityRecommendation = require('../models/OpportunityRecommendation');

const normalizeSkills = (skills = []) => skills
  .filter(Boolean)
  .map((skill) => String(skill).trim())
  .filter(Boolean);

const normalizeSkillSet = (skills = []) => new Set(
  normalizeSkills(skills).map((skill) => skill.toLowerCase())
);

const computeEligibility = ({ userSkills = [], opportunitySkills = [] }) => {
  const normalizedOpportunitySkills = normalizeSkills(opportunitySkills);
  const userSkillSet = normalizeSkillSet(userSkills);

  const matchedSkills = normalizedOpportunitySkills.filter((skill) => userSkillSet.has(skill.toLowerCase()));
  const missingSkills = normalizedOpportunitySkills.filter((skill) => !userSkillSet.has(skill.toLowerCase()));

  const denominator = normalizedOpportunitySkills.length;
  const matchScore = denominator > 0 ? Number((matchedSkills.length / denominator).toFixed(2)) : 0;

  return {
    eligible: matchScore > 0.6,
    matchScore,
    matchedSkills,
    missingSkills,
  };
};

const upsertRecommendationForUser = async ({ userId, opportunity }) => {
  const profile = await UserProfile.findOne({ userId }).lean();
  if (!profile || !opportunity) {
    return null;
  }

  const recommendation = computeEligibility({
    userSkills: profile.skills || [],
    opportunitySkills: opportunity.skills || [],
  });

  const updated = await OpportunityRecommendation.findOneAndUpdate(
    { userId, opportunityId: opportunity._id },
    {
      $set: {
        eligible: recommendation.eligible,
        matchScore: recommendation.matchScore,
        matchedSkills: recommendation.matchedSkills,
        missingSkills: recommendation.missingSkills,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return updated;
};

const updateRecommendationsForOpportunity = async (opportunity, targetUserId = null) => {
  if (!opportunity?._id) {
    return [];
  }

  if (targetUserId) {
    const singleUpdate = await upsertRecommendationForUser({
      userId: targetUserId,
      opportunity,
    });
    return singleUpdate ? [singleUpdate] : [];
  }

  const profiles = await UserProfile.find({}).select('userId skills').lean();
  const updates = profiles.map((profile) => upsertRecommendationForUser({
    userId: profile.userId,
    opportunity,
  }));

  return Promise.all(updates);
};

const getUserRecommendations = async (userId, limit = 20) => {
  const recommendations = await OpportunityRecommendation.find({ userId })
    .populate('opportunityId', 'title company')
    .sort({ matchScore: -1, updatedAt: -1 })
    .limit(limit)
    .lean();

  if (!recommendations.length) {
    const opportunities = await Opportunity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    await Promise.all(opportunities.map((opportunity) => upsertRecommendationForUser({ userId, opportunity })));

    return getUserRecommendations(userId, limit);
  }

  return recommendations
    .filter((item) => item.opportunityId)
    .map((item) => ({
      opportunityId: item.opportunityId._id,
      title: item.opportunityId.title,
      company: item.opportunityId.company,
      matchScore: item.matchScore,
      matchedSkills: item.matchedSkills || [],
      missingSkills: item.missingSkills || [],
    }));
};

module.exports = {
  computeEligibility,
  getUserRecommendations,
  updateRecommendationsForOpportunity,
};
