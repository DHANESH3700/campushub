const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: Number,
    section: String,
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classroom: String,
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { timestamps: true }
);

const calendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['holiday', 'exam', 'deadline', 'event', 'other'], required: true },
    start: { type: Date, required: true },
    end: Date,
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    description: String,
    allDay: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = {
  TimetableSlot: mongoose.model('TimetableSlot', slotSchema),
  CalendarEvent: mongoose.model('CalendarEvent', calendarEventSchema)
};
