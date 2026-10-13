const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../config/constants');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    section: String,
    semester: Number,
    date: { type: Date, required: true },
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    corrections: [
      {
        previous: String,
        next: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
