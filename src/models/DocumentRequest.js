const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['bonafide', 'transcript', 'transfer', 'character', 'fee_receipt', 'other'],
      required: true
    },
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: ['submitted', 'in_review', 'approved', 'rejected', 'ready', 'closed'],
      default: 'submitted'
    },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewComment: String,
    completedDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
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

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
