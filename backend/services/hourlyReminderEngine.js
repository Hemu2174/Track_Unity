const cron = require('node-cron');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');

const MS_PER_HOUR = 1000 * 60 * 60;

const buildReminderMessage = (title, deadline) => {
  if (!deadline) {
    return `"${title}" application is still pending — don't forget to apply!`;
  }

  const now = Date.now();
  const msRemaining = new Date(deadline).getTime() - now;
  const hoursRemaining = msRemaining / MS_PER_HOUR;

  if (hoursRemaining <= 0) {
    return `"${title}" deadline has passed — submit your application now if you haven't!`;
  }

  if (hoursRemaining <= 1) {
    return `⚡ "${title}" deadline in less than 1 hour!`;
  }

  if (hoursRemaining <= 24) {
    const h = Math.floor(hoursRemaining);
    return `"${title}" application still pending — deadline in ${h} hour${h === 1 ? '' : 's'}`;
  }

  if (hoursRemaining <= 48) {
    return `"${title}" application still pending — deadline is tomorrow`;
  }

  const days = Math.floor(hoursRemaining / 24);
  return `"${title}" application is pending — deadline in ${days} days`;
};

const computePriorityRank = (deadline) => {
  if (!deadline) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(deadline).getTime() - Date.now();
  return ms > 0 ? ms : 0;
};

const processReminders = async () => {
  try {
    // Find all opportunities that haven't been fully applied, with a userId
    const pending = await Opportunity.find({
      applicationStatus: { $in: ['not_applied', 'clicked_apply'] },
      userId: { $ne: null },
    }).select('_id title company deadline userId applicationStatus').lean();

    if (!pending.length) return;

    const now = new Date();
    const notifications = [];
    const bulkUpdates = [];

    for (const opp of pending) {
      const message = buildReminderMessage(
        `${opp.company ? `${opp.company} — ` : ''}${opp.title}`,
        opp.deadline
      );

      notifications.push({
        userId: opp.userId,
        opportunityId: opp._id,
        message,
        type: 'reminder',
        seen: false,
        createdAt: now,
      });

      bulkUpdates.push({
        updateOne: {
          filter: { _id: opp._id },
          update: { $set: { priorityRank: computePriorityRank(opp.deadline) } },
        },
      });
    }

    await Notification.insertMany(notifications, { ordered: false });
    await Opportunity.bulkWrite(bulkUpdates, { ordered: false });

    console.log(`[HourlyReminderEngine] Created ${notifications.length} reminder(s) for ${pending.length} pending application(s)`);
  } catch (error) {
    console.error(`[HourlyReminderEngine] Error: ${error.message}`);
  }
};

const startHourlyReminderEngine = () => {
  // Run at the top of every hour
  cron.schedule('0 * * * *', processReminders, { timezone: 'UTC' });
  console.log('[HourlyReminderEngine] Scheduler started — runs every hour');

  // Run once immediately on startup so the priority ranking is populated right away
  setImmediate(processReminders);
};

module.exports = { startHourlyReminderEngine, processReminders };
