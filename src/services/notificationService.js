const { Notification } = require('../models/Notification');
const User = require('../models/User');
const { sendEmail, branded } = require('./emailService');
const logger = require('../utils/logger');

async function notify({ userId, title, body, link, type, dedupeKey, email = true }) {
  const user = await User.findById(userId);
  if (!user) return null;
  try {
    const doc = await Notification.create({
      user: userId,
      title,
      body,
      link,
      type,
      dedupeKey
    });
    if (email && user.notificationPrefs?.email !== false) {
      const tpl = branded(title, body || '');
      await sendEmail({ to: user.email, subject: title, ...tpl });
    }
    return doc;
  } catch (err) {
    if (err.code === 11000) return null;
    logger.warn('Notification failed', err.message);
    return null;
  }
}

module.exports = { notify };
