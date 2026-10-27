const { Notification } = require('../models/Notification');
const User = require('../models/User');
const { sendEmail, branded } = require('./emailService');
const { sendPushNotifications } = require('./pushService');
const logger = require('../utils/logger');

async function notify({ userId, title, body, link, type, dedupeKey, email = true }) {
  const user = await User.findById(userId);
  if (!user) return null;
  let doc;
  try {
    doc = await Notification.create({
      user: userId,
      title,
      body,
      link,
      type,
      dedupeKey
    });
  } catch (err) {
    if (err.code === 11000) return null;
    logger.warn('Notification failed', err.message);
    return null;
  }
  if (email && user.notificationPrefs?.email !== false) {
    try {
      const tpl = branded(title, body || '');
      await sendEmail({ to: user.email, subject: title, ...tpl });
    } catch (error) {
      logger.warn('Notification email failed', error.message);
    }
  }
  if (user.notificationPrefs?.push === true) {
    await sendPushNotifications(userId, doc);
  }
  return doc;
}

module.exports = { notify };
