const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['academic', 'hackathon', 'sports', 'cultural', 'certification', 'other'],
      required: true
    },
    description: String,
    date: Date,
    evidence: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
