const mongoose = require('mongoose');
const { PRIORITIES } = require('../config/constants');

const issueSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['issue', 'complaint'], default: 'issue' },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 4000 },
    category: {
      type: String,
      enum: ['infrastructure', 'classroom', 'laboratory', 'electricity', 'internet', 'water', 'hostel', 'transport', 'other'],
      required: true
    },
    location: String,
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' }],
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['submitted', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'],
      default: 'submitted'
    },
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        body: String,
        at: { type: Date, default: Date.now }
      }
    ],
    resolutionNote: String,
    history: [
      {
        status: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Issue', issueSchema);
