const mongoose = require('mongoose');
const { ASSIGNMENT_STATUS } = require('../config/constants');

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    instructions: String,
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    semester: Number,
    section: String,
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deadline: { type: Date, required: true },
    maxMarks: { type: Number, default: 100 },
    attachment: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    allowLate: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    notes: String,
    status: { type: String, enum: ASSIGNMENT_STATUS, default: 'submitted' },
    submittedAt: { type: Date, default: Date.now },
    marks: Number,
    feedback: String,
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = {
  Assignment: mongoose.model('Assignment', assignmentSchema),
  Submission: mongoose.model('Submission', submissionSchema)
};
