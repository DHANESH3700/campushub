const mongoose = require('mongoose');

const markSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    assessmentType: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentType', required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true },
    published: { type: Boolean, default: false },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    history: [
      {
        previous: Number,
        next: Number,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

markSchema.index({ student: 1, subject: 1, assessmentType: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
