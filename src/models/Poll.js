const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    questions: [
      {
        prompt: String,
        type: { type: String, enum: ['single', 'multiple', 'text'], default: 'single' },
        options: [String]
      }
    ],
    audience: { type: String, enum: ['all', 'students', 'faculty'], default: 'all' },
    anonymous: { type: Boolean, default: false },
    deadline: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const responseSchema = new mongoose.Schema(
  {
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answers: [mongoose.Schema.Types.Mixed]
  },
  { timestamps: true }
);

responseSchema.index({ poll: 1, user: 1 }, { unique: true, sparse: true });

module.exports = {
  Poll: mongoose.model('Poll', pollSchema),
  PollResponse: mongoose.model('PollResponse', responseSchema)
};
