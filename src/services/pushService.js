const webPush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const logger = require('../utils/logger');

let vapidConfigured = false;

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey && !privateKey) return null;
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must be configured together');
  }
  return { publicKey, privateKey, subject };
}

function configure() {
  const config = getVapidConfig();
  if (!config) return null;
  if (!vapidConfigured) {
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidConfigured = true;
  }
  return config;
}

function isAllowedEndpoint(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
  const allowedHosts = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
  return allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

function truncateUtf8(value, maxBytes) {
  let result = '';
  for (const character of value) {
    if (Buffer.byteLength(result + character) > maxBytes) break;
    result += character;
  }
  return result;
}

async function sendPushNotifications(userId, notification) {
  try {
    if (!configure()) return;
    const subscriptions = await PushSubscription.find({ user: userId });
    const link = typeof notification.link === 'string' && notification.link.startsWith('/') && !notification.link.startsWith('//')
      ? notification.link
      : '/';
    const payload = JSON.stringify({
      title: truncateUtf8(String(notification.title || 'CampusHub'), 120),
      body: truncateUtf8(String(notification.body || ''), 1800),
      link: truncateUtf8(link, 512)
    });
    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webPush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          payload
        )
      )
    );
    const expiredIds = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const statusCode = result.reason?.statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(subscriptions[index]._id);
        else logger.warn('Web push delivery failed', result.reason?.message || result.reason);
      }
    });
    if (expiredIds.length) await PushSubscription.deleteMany({ _id: { $in: expiredIds } });
  } catch (error) {
    logger.warn('Web push delivery failed', error.message);
  }
}

module.exports = { getVapidConfig, configure, isAllowedEndpoint, sendPushNotifications };
