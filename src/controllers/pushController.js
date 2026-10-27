const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const pushService = require('../services/pushService');

const config = asyncHandler(async (req, res) => {
  const vapid = pushService.getVapidConfig();
  const subscribed = req.query.endpoint
    ? await PushSubscription.exists({ user: req.user._id, endpoint: req.query.endpoint })
    : false;
  res.json({
    success: true,
    enabled: Boolean(vapid),
    publicKey: vapid?.publicKey || null,
    subscribed: Boolean(subscribed)
  });
});

const subscribe = asyncHandler(async (req, res) => {
  if (!pushService.configure()) throw new AppError('Web push is not configured on this server', 503);
  const { endpoint, keys } = req.body || {};
  if (
    typeof endpoint !== 'string' ||
    endpoint.length > 2048 ||
    !pushService.isAllowedEndpoint(endpoint) ||
    !keys ||
    typeof keys.p256dh !== 'string' ||
    typeof keys.auth !== 'string' ||
    !keys.p256dh ||
    !keys.auth ||
    keys.p256dh.length > 512 ||
    keys.auth.length > 512
  ) {
    throw new AppError('A valid browser push subscription is required', 400);
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { $set: { user: req.user._id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await User.updateOne({ _id: req.user._id }, { $set: { 'notificationPrefs.push': true } });
  res.status(201).json({ success: true });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body || {};
  if (typeof endpoint !== 'string' || !pushService.isAllowedEndpoint(endpoint)) {
    throw new AppError('A valid browser push endpoint is required', 400);
  }
  await PushSubscription.deleteOne({ user: req.user._id, endpoint });
  const stillSubscribed = await PushSubscription.exists({ user: req.user._id });
  await User.updateOne({ _id: req.user._id }, { $set: { 'notificationPrefs.push': Boolean(stillSubscribed) } });
  res.json({ success: true });
});

module.exports = { config, subscribe, unsubscribe };
