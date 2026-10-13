const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'institution' },
    institutionName: { type: String, default: 'CampusHub College' },
    attendanceWarningPercent: { type: Number, default: 75 },
    leaveTypes: [String],
    issueCategories: [String],
    documentCategories: [String],
    resourceCategories: [String],
    policies: Object,
    emailEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
