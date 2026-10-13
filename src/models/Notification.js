const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: String,
    link: String,
    read: { type: Boolean, default: false },
    type: String,
    dedupeKey: String
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true, sparse: true });

const templateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    subject: String,
    html: String,
    text: String
  },
  { timestamps: true }
);

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
  NotificationTemplate: mongoose.model('NotificationTemplate', templateSchema)
};
