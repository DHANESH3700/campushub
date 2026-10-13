const Resource = require('../models/Resource');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Marks');
const { TimetableSlot, CalendarEvent } = require('../models/Timetable');
const { Assignment, Submission } = require('../models/Assignment');
const Settings = require('../models/Settings');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { departmentFilter } = require('../services/accessService');
const { saveUpload } = require('../services/fileService');
const { notify } = require('../services/notificationService');
const { toCsv } = require('../utils/csv');

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

const resources = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip, sort } = parsePagination(req.query);
    const filter = { archived: req.query.archived === 'true' ? true : false, ...departmentFilter(req.user) };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.semester) filter.semester = Number(req.query.semester);
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.q) filter.$text = { $search: req.query.q };
    const [items, total] = await Promise.all([
      Resource.find(filter).populate('subject department file').sort(sort).skip(skip).limit(limit),
      Resource.countDocuments(filter)
    ]);
    res.json({ success: true, ...paginated(items, total, page, limit) });
  }),
  create: asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('File is required', 400);
    const file = await saveUpload(req, req.file, 'department');
    const item = await Resource.create({ ...req.body, file: file._id, uploadedBy: req.user._id, department: req.body.department || req.user.department });
    res.status(201).json({ success: true, item });
  }),
  update: asyncHandler(async (req, res) => {
    const item = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) throw new AppError('Not found', 404);
    res.json({ success: true, item });
  })
};

const attendance = {
  list: asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role === 'student') filter.student = req.user._id;
    else {
      Object.assign(filter, departmentFilter(req.user));
      if (req.query.student) filter.student = req.query.student;
    }
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.date) filter.date = new Date(req.query.date);
    const items = await Attendance.find(filter).populate('student subject', 'name code').sort('-date').limit(500);
    let percentage = null;
    if (req.user.role === 'student' || req.query.student) {
      const present = items.filter((i) => ['present', 'late', 'on_duty', 'excused'].includes(i.status)).length;
      percentage = items.length ? Math.round((present / items.length) * 1000) / 10 : 0;
    }
    res.json({ success: true, items, percentage });
  }),
  record: asyncHandler(async (req, res) => {
    const records = Array.isArray(req.body.records) ? req.body.records : [req.body];
    const saved = [];
    for (const r of records) {
      const doc = await Attendance.findOneAndUpdate(
        { student: r.student, subject: r.subject, date: new Date(r.date) },
        {
          ...r,
          faculty: req.user._id,
          department: req.user.department,
          $push: r.correction
            ? { corrections: { previous: r.previous, next: r.status, actor: req.user._id, reason: r.reason } }
            : []
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      saved.push(doc);
    }
    res.status(201).json({ success: true, items: saved });
  }),
  report: asyncHandler(async (req, res) => {
    const items = await Attendance.find(departmentFilter(req.user)).populate('student subject', 'name code');
    const csv = toCsv(items, [
      { label: 'Student', value: (r) => r.student?.name },
      { label: 'Subject', value: (r) => r.subject?.code },
      { label: 'Date', value: (r) => r.date?.toISOString().slice(0, 10) },
      { label: 'Status', value: 'status' }
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  })
};

const timetable = {
  list: asyncHandler(async (req, res) => {
    const filter = { ...departmentFilter(req.user) };
    if (req.user.role === 'student') {
      if (req.user.semester) filter.semester = req.user.semester;
      if (req.user.section) filter.section = req.user.section;
    }
    if (req.user.role === 'faculty') filter.faculty = req.user._id;
    const items = await TimetableSlot.find(filter).populate('subject faculty', 'name code');
    const calendar = await CalendarEvent.find({
      $or: [{ department: null }, { department: req.user.department }]
    }).sort('start');
    res.json({ success: true, items, calendar });
  }),
  create: asyncHandler(async (req, res) => {
    const { faculty, classroom, dayOfWeek, startTime, endTime } = req.body;
    const existing = await TimetableSlot.find({ dayOfWeek });
    for (const e of existing) {
      if (!overlaps(startTime, endTime, e.startTime, e.endTime)) continue;
      if (String(e.faculty) === String(faculty)) throw new AppError('Faculty has a conflicting class', 409);
      if (e.classroom && classroom && e.classroom === classroom) throw new AppError('Classroom conflict', 409);
    }
    const item = await TimetableSlot.create({ ...req.body, department: req.body.department || req.user.department });
    res.status(201).json({ success: true, item });
  }),
  calendarCreate: asyncHandler(async (req, res) => {
    const item = await CalendarEvent.create(req.body);
    res.status(201).json({ success: true, item });
  })
};

const marks = {
  list: asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role === 'student') {
      filter.student = req.user._id;
      filter.published = true;
    } else if (req.query.student) filter.student = req.query.student;
    const items = await Mark.find(filter).populate('subject assessmentType student', 'name code');
    res.json({ success: true, items });
  }),
  upsert: asyncHandler(async (req, res) => {
    const { student, subject, assessmentType, marksObtained, maxMarks, published } = req.body;
    if (marksObtained > maxMarks) throw new AppError('Marks cannot exceed maximum', 400);
    let item = await Mark.findOne({ student, subject, assessmentType });
    if (item) {
      item.history.push({ previous: item.marksObtained, next: marksObtained, actor: req.user._id });
      item.marksObtained = marksObtained;
      item.maxMarks = maxMarks;
      if (published !== undefined) item.published = published;
      await item.save();
    } else {
      item = await Mark.create({ ...req.body, enteredBy: req.user._id });
    }
    res.json({ success: true, item });
  })
};

const assignments = {
  list: asyncHandler(async (req, res) => {
    const filter = { ...departmentFilter(req.user) };
    if (req.user.role === 'faculty') filter.faculty = req.user._id;
    const items = await Assignment.find(filter).populate('subject faculty').sort('-deadline');
    let submissions = [];
    if (req.user.role === 'student') {
      submissions = await Submission.find({ student: req.user._id });
    } else {
      submissions = await Submission.find({ assignment: { $in: items.map((i) => i._id) } }).populate('student', 'name');
    }
    res.json({ success: true, items, submissions });
  }),
  create: asyncHandler(async (req, res) => {
    let attachment;
    if (req.file) attachment = (await saveUpload(req, req.file, 'department'))._id;
    const item = await Assignment.create({
      ...req.body,
      faculty: req.user._id,
      department: req.user.department,
      attachment
    });
    res.status(201).json({ success: true, item });
  }),
  submit: asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) throw new AppError('Not found', 404);
    const late = new Date() > assignment.deadline;
    if (late && !assignment.allowLate) throw new AppError('Deadline passed', 400);
    if (!req.file) throw new AppError('Submission file required', 400);
    const file = await saveUpload(req, req.file, 'private');
    const item = await Submission.findOneAndUpdate(
      { assignment: assignment._id, student: req.user._id },
      { file: file._id, notes: req.body.notes, status: late ? 'late' : 'submitted', submittedAt: new Date() },
      { upsert: true, new: true }
    );
    await notify({
      userId: assignment.faculty,
      title: 'Assignment submitted',
      body: `${req.user.name} submitted ${assignment.title}`,
      link: '/#assignments',
      type: 'assignment',
      email: false
    });
    res.status(201).json({ success: true, item });
  }),
  grade: asyncHandler(async (req, res) => {
    const item = await Submission.findById(req.params.submissionId).populate('assignment student');
    if (!item) throw new AppError('Not found', 404);
    item.marks = req.body.marks;
    item.feedback = req.body.feedback;
    item.status = req.body.status || 'graded';
    item.gradedBy = req.user._id;
    await item.save();
    await notify({
      userId: item.student._id,
      title: 'Assignment graded',
      body: item.feedback || `You received ${item.marks} marks.`,
      link: '/#assignments',
      type: 'assignment'
    });
    res.json({ success: true, item });
  })
};

const threshold = asyncHandler(async (req, res) => {
  const s = (await Settings.findOne({ key: 'institution' })) || { attendanceWarningPercent: 75 };
  res.json({ success: true, attendanceWarningPercent: s.attendanceWarningPercent });
});

module.exports = { resources, attendance, timetable, marks, assignments, threshold };
