const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const Issue = require('../models/Issue');
const DocumentRequest = require('../models/DocumentRequest');
const Attendance = require('../models/Attendance');
const { Assignment, Submission } = require('../models/Assignment');
const { CampusEvent, Announcement } = require('../models/Event');
const Resource = require('../models/Resource');
const { Opportunity, PlacementApplication } = require('../models/Placement');
const { Scholarship } = require('../models/Scholarship');
const { Notification } = require('../models/Notification');
const { TimetableSlot, CalendarEvent } = require('../models/Timetable');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const Settings = require('../models/Settings');

const overview = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const now = new Date();
  const announcements = await Announcement.find({ published: true, archived: false }).sort('-createdAt').limit(6);
  const events = await CampusEvent.find({ published: true, archived: false, start: { $gte: now } }).sort('start').limit(6);
  const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(8);

  if (role === 'student') {
    const attendance = await Attendance.find({ student: req.user._id });
    const present = attendance.filter((a) => ['present', 'late', 'on_duty', 'excused'].includes(a.status)).length;
    const percentage = attendance.length ? Math.round((present / attendance.length) * 1000) / 10 : 0;
    const settings = await Settings.findOne({ key: 'institution' });
    const leaves = await LeaveRequest.find({ student: req.user._id }).sort('-createdAt').limit(5);
    const issues = await Issue.find({ submittedBy: req.user._id }).sort('-createdAt').limit(5);
    const docs = await DocumentRequest.find({ requester: req.user._id }).sort('-createdAt').limit(5);
    const assignments = await Assignment.find({
      department: req.user.department,
      deadline: { $gte: now }
    }).sort('deadline').limit(6);
    const resources = await Resource.find({ archived: false }).sort('-createdAt').limit(5);
    const jobs = await Opportunity.find({ published: true }).sort('-createdAt').limit(5);
    const scholarships = await Scholarship.find({ published: true }).sort('deadline').limit(5);
    const timetable = await TimetableSlot.find({
      department: req.user.department,
      semester: req.user.semester,
      section: req.user.section
    }).populate('subject', 'name code');
    const calendar = await CalendarEvent.find({ start: { $gte: now } }).sort('start').limit(8);
    return res.json({
      success: true,
      dashboard: {
        role,
        attendancePercent: percentage,
        warning: percentage && settings && percentage < settings.attendanceWarningPercent,
        announcements,
        events,
        notifications,
        pendingRequests: [...leaves, ...docs].filter((x) => ['pending', 'submitted', 'in_review'].includes(x.status)),
        issues,
        assignments,
        resources,
        jobs,
        scholarships,
        timetable,
        calendar
      }
    });
  }

  if (role === 'faculty') {
    const pendingLeaves = await LeaveRequest.find({ status: 'pending' }).populate('student', 'name').limit(10);
    const assignedIssues = await Issue.find({ $or: [{ assignee: req.user._id }, { department: req.user.department }], status: { $ne: 'closed' } }).limit(10);
    const timetable = await TimetableSlot.find({ faculty: req.user._id }).populate('subject', 'name');
    const myAssignments = await Assignment.find({ faculty: req.user._id });
    const awaiting = await Submission.find({ assignment: { $in: myAssignments.map((a) => a._id) }, status: { $in: ['submitted', 'late'] } }).populate('student assignment');
    return res.json({
      success: true,
      dashboard: { role, pendingLeaves, assignedIssues, timetable, awaiting, announcements, events, notifications }
    });
  }

  const [students, faculty, departments] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'faculty' }),
    User.distinct('department')
  ]);
  const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });
  const openIssues = await Issue.countDocuments({ status: { $in: ['submitted', 'assigned', 'in_progress'] } });
  const pendingDocs = await DocumentRequest.countDocuments({ status: { $in: ['submitted', 'in_review'] } });
  const placed = await PlacementApplication.countDocuments({ status: { $in: ['offered', 'placed'] } });
  const recentAudit = await AuditLog.find().sort('-createdAt').limit(10).populate('actor', 'name role');
  const eventRegs = await CampusEvent.countDocuments({ archived: false });
  res.json({
    success: true,
    dashboard: {
      role,
      stats: { students, faculty, departments: departments.filter(Boolean).length, pendingLeaves, openIssues, pendingDocs, placed, eventRegs },
      announcements,
      events,
      notifications,
      recentAudit
    }
  });
});

module.exports = { overview };
