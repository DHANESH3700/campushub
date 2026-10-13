const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    start: { type: Date, required: true },
    end: Date,
    venue: String,
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    capacity: Number,
    registrationDeadline: Date,
    attachment: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    published: { type: Boolean, default: true },
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const registrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'CampusEvent', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' }
  },
  { timestamps: true }
);

registrationSchema.index({ event: 1, user: 1 }, { unique: true });

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    audience: { type: String, enum: ['all', 'students', 'faculty', 'staff'], default: 'all' },
    attachment: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    published: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = {
  CampusEvent: mongoose.model('CampusEvent', eventSchema),
  EventRegistration: mongoose.model('EventRegistration', registrationSchema),
  Announcement: mongoose.model('Announcement', announcementSchema)
};
