const Resource = require('../models/Resource');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Marks');
const { TimetableSlot, CalendarEvent } = require('../models/Timetable');
const { Assignment, Submission } = require('../models/Assignment');
const User = require('../models/User');
const { Subject } = require('../models/Academic');
const Settings = require('../models/Settings');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { departmentFilter } = require('../services/accessService');
const { saveUpload } = require('../services/fileService');
const { notify } = require('../services/notificationService');
const { toCsv } = require('../utils/csv');
const { createReportPdf } = require('../services/pdfService');
const mongoose = require('mongoose');

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function timeInMinutes(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

async function findSubject(value, departmentId, regulation) {
  const subjectValue = typeof value === 'string' ? value.trim() : '';
  if (!subjectValue) throw new AppError('Select a subject before saving', 400);

  let subject;
  if (mongoose.isValidObjectId(subjectValue)) {
    subject = await Subject.findById(subjectValue);
  } else {
    const filter = { code: subjectValue.toUpperCase() };
    if (departmentId) filter.department = departmentId;
    if (regulation) filter.regulation = regulation.toUpperCase();
    const matches = await Subject.find(filter).limit(2);
    if (matches.length > 1) {
      throw new AppError('Subject code is ambiguous. Select a subject from the list or include its department and regulation.', 400);
    }
    subject = matches[0];
  }
  if (!subject) {
    throw new AppError('Subject not found. Choose an existing subject or enter its subject code.', 400);
  }
  return subject;
}

async function timetableValues(req) {
  const { subject: subjectId, startTime, endTime, classroom, section } = req.body;
  const dayOfWeek = Number(req.body.dayOfWeek);
  const start = timeInMinutes(startTime);
  const end = timeInMinutes(endTime);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new AppError('Day of week must be between 0 and 6', 400);
  }
  if (start === null || end === null || start >= end) {
    throw new AppError('Enter a valid start time before the end time (HH:MM)', 400);
  }

  const departmentId = req.user.role === 'faculty' ? req.user.department : req.body.department;
  const subject = await findSubject(subjectId, departmentId, req.body.regulation);
  if (req.user.role === 'faculty' && String(subject.department) !== String(req.user.department)) {
    throw new AppError('Subject must belong to your department', 403);
  }

  const facultyId = req.user.role === 'faculty' ? req.user._id : req.body.faculty;
  if (!mongoose.isValidObjectId(facultyId)) throw new AppError('A valid faculty member is required', 400);
  const faculty = await User.findOne({ _id: facultyId, role: 'faculty' });
  if (!faculty) throw new AppError('Faculty member not found', 404);
  if (faculty.department && String(faculty.department) !== String(subject.department)) {
    throw new AppError('Faculty member and subject must belong to the same department', 400);
  }
  const semester = req.body.semester === '' || req.body.semester === undefined
    ? subject.semester
    : Number(req.body.semester);
  if (semester !== undefined && (!Number.isFinite(semester) || semester < 1)) {
    throw new AppError('Semester must be a positive number', 400);
  }

  return {
    department: subject.department,
    semester,
    section: section || undefined,
    subject: subject._id,
    faculty: faculty._id,
    classroom: classroom || undefined,
    dayOfWeek,
    startTime,
    endTime
  };
}

async function checkTimetableConflicts(values, excludeId) {
  const filter = { dayOfWeek: values.dayOfWeek };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await TimetableSlot.find(filter);
  for (const slot of existing) {
    if (!overlaps(values.startTime, values.endTime, slot.startTime, slot.endTime)) continue;
    if (String(slot.faculty) === String(values.faculty)) throw new AppError('Faculty has a conflicting class', 409);
    if (slot.classroom && values.classroom && slot.classroom === values.classroom) {
      throw new AppError('Classroom conflict', 409);
    }
  }
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
    const columns = [
      { label: 'Student', value: (r) => r.student?.name },
      { label: 'Subject', value: (r) => r.subject?.code },
      { label: 'Date', value: (r) => r.date?.toISOString().slice(0, 10) },
      { label: 'Status', value: 'status' }
    ];
    if (req.query.format === 'pdf') {
      return createReportPdf(res, 'Attendance report', items, columns);
    }
    if (req.query.format && req.query.format !== 'csv') {
      throw new AppError('Unsupported report format', 400);
    }
    res.type('text/csv').send(toCsv(items, columns));
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
    const values = await timetableValues(req);
    await checkTimetableConflicts(values);
    const item = await TimetableSlot.create(values);
    res.status(201).json({ success: true, item });
  }),
  update: asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Timetable slot not found', 404);
    const item = await TimetableSlot.findById(req.params.id);
    if (!item) throw new AppError('Timetable slot not found', 404);
    if (req.user.role === 'faculty' && String(item.faculty) !== String(req.user._id)) {
      throw new AppError('You can only update your own timetable slots', 403);
    }

    const values = await timetableValues(req);
    await checkTimetableConflicts(values, item._id);
    Object.assign(item, values);
    await item.save();
    res.json({ success: true, item });
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
    const items = await Assignment.find(filter).populate('subject faculty attachment').sort('-deadline');
    let submissions = [];
    if (req.user.role === 'student') {
      submissions = await Submission.find({ student: req.user._id });
    } else {
      submissions = await Submission.find({ assignment: { $in: items.map((i) => i._id) } }).populate('student', 'name');
    }
    res.json({ success: true, items, submissions });
  }),
  create: asyncHandler(async (req, res) => {
    const departmentId = req.user.role === 'faculty' ? req.user.department : req.body.department;
    const subject = await findSubject(req.body.subject, departmentId, req.body.regulation);
    if (req.user.role === 'faculty' && String(subject.department) !== String(req.user.department)) {
      throw new AppError('Subject must belong to your department', 403);
    }

    let attachment;
    if (req.file) {
      req.uploadDepartment = subject.department;
      attachment = (await saveUpload(req, req.file, 'department'))._id;
    }
    const item = await Assignment.create({
      ...req.body,
      subject: subject._id,
      faculty: req.user._id,
      department: subject.department,
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
