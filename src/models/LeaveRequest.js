const mongoose = require('mongoose');
const { LEAVE_TYPES } = require('../config/constants');

const leaveRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true, maxlength: 2000 },
    attachment: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewComment: String,
    history: [
      {
        status: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: String,
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

leaveRequestSchema.index({ student: 1, fromDate: 1, toDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
