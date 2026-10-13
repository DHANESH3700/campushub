const { Assignment, Submission } = require('../models/Assignment');
const { Opportunity } = require('../models/Placement');
const { Scholarship } = require('../models/Scholarship');
const { notify } = require('./notificationService');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

let timer;

async function runReminders() {
  const now = new Date();
  const soon = new Date(Date.now() + 48 * 3600 * 1000);
  const assignments = await Assignment.find({ deadline: { $gte: now, $lte: soon } });
  for (const a of assignments) {
    const students = await User.find({ role: 'student', department: a.department, isActive: true }).select('_id');
    for (const s of students) {
      const sub = await Submission.findOne({ assignment: a._id, student: s._id });
      if (!sub) {
        await notify({
          userId: s._id,
          title: 'Assignment deadline soon',
          body: `${a.title} is due soon.`,
          link: '/#assignments',
          type: 'assignment',
          dedupeKey: `asg-${a._id}-${s._id}`
        });
      }
    }
  }
  const jobs = await Opportunity.find({ published: true, deadline: { $gte: now, $lte: soon } });
  const scholars = await Scholarship.find({ published: true, deadline: { $gte: now, $lte: soon } });
  const students = await User.find({ role: 'student', isActive: true }).select('_id');
  for (const j of jobs) {
    for (const s of students) {
      await notify({
        userId: s._id,
        title: 'Placement deadline',
        body: `${j.title} closes soon.`,
        link: '/#placements',
        type: 'placement',
        dedupeKey: `job-${j._id}-${s._id}`,
        email: false
      });
    }
  }
  for (const sc of scholars) {
    for (const s of students) {
      await notify({
        userId: s._id,
        title: 'Scholarship deadline',
        body: `${sc.title} closes soon.`,
        link: '/#scholarships',
        type: 'scholarship',
        dedupeKey: `sch-${sc._id}-${s._id}`,
        email: false
      });
    }
  }
  const settings = await Settings.findOne({ key: 'institution' });
  const threshold = settings?.attendanceWarningPercent || 75;
  for (const s of students) {
    const recs = await Attendance.find({ student: s._id });
    if (!recs.length) continue;
    const present = recs.filter((r) => ['present', 'late', 'on_duty', 'excused'].includes(r.status)).length;
    const pct = (present / recs.length) * 100;
    if (pct < threshold) {
      await notify({
        userId: s._id,
        title: 'Attendance warning',
        body: `Your attendance is ${pct.toFixed(1)}%, below the ${threshold}% threshold.`,
        link: '/#attendance',
        type: 'attendance',
        dedupeKey: `attwarn-${s._id}-${new Date().toISOString().slice(0, 10)}`,
        email: true
      });
    }
  }
  logger.info('Reminder pass complete');
}

function startReminderJob() {
  if (process.env.NODE_ENV === 'test') return;
  const sixHours = 6 * 60 * 60 * 1000;
  timer = setInterval(() => runReminders().catch((e) => logger.warn(e.message)), sixHours);
}

function stopReminderJob() {
  if (timer) clearInterval(timer);
}

module.exports = { runReminders, startReminderJob, stopReminderJob };
