const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { notify } = require('../services/notificationService');
const { audit } = require('../services/auditService');
const { saveUpload } = require('../services/fileService');
const { LEAVE_TYPES } = require('../config/constants');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filter = {};
  if (req.user.role === 'student') filter.student = req.user._id;
  else if (req.user.role === 'faculty') {
    const ids = await User.find({ role: 'student', department: req.user.department }).distinct('_id');
    filter.student = { $in: ids };
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  const [items, total] = await Promise.all([
    LeaveRequest.find(filter).populate('student', 'name email').sort(sort).skip(skip).limit(limit),
    LeaveRequest.countDocuments(filter)
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const { type, fromDate, toDate, reason } = req.body;
  if (!LEAVE_TYPES.includes(type)) throw new AppError('Invalid leave type', 400);
  if (new Date(toDate) < new Date(fromDate)) throw new AppError('End date must be after start date', 400);
  const overlap = await LeaveRequest.findOne({
    student: req.user._id,
    status: { $in: ['pending', 'approved'] },
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate }
  });
  if (overlap) throw new AppError('A leave request already covers these dates', 409);
  let attachment;
  if (req.file) attachment = (await saveUpload(req, req.file))._id;
  const item = await LeaveRequest.create({
    student: req.user._id,
    type,
    fromDate,
    toDate,
    reason,
    attachment,
    history: [{ status: 'pending', actor: req.user._id, comment: 'submitted' }]
  });
  await audit(req, 'leave.create', 'LeaveRequest', item._id);
  res.status(201).json({ success: true, item });
});

const review = asyncHandler(async (req, res) => {
  const item = await LeaveRequest.findById(req.params.id).populate('student');
  if (!item) throw new AppError('Not found', 404);
  if (!['approved', 'rejected'].includes(req.body.status)) throw new AppError('Invalid status', 400);
  if (req.user.role === 'faculty' && String(req.user.department) !== String(item.student.department)) {
    throw new AppError('Not authorized for this department', 403);
  }
  item.status = req.body.status;
  item.reviewer = req.user._id;
  item.reviewComment = req.body.comment;
  item.history.push({ status: item.status, actor: req.user._id, comment: req.body.comment });
  await item.save();
  await notify({
    userId: item.student._id || item.student,
    title: `Leave ${item.status}`,
    body: req.body.comment || `Your leave request was ${item.status}.`,
    link: '/#leave',
    type: 'leave'
  });
  await audit(req, 'leave.review', 'LeaveRequest', item._id);
  res.json({ success: true, item });
});

const cancel = asyncHandler(async (req, res) => {
  const item = await LeaveRequest.findById(req.params.id);
  if (!item) throw new AppError('Not found', 404);
  if (String(item.student) !== String(req.user._id) && req.user.role !== 'admin') throw new AppError('Not authorized', 403);
  if (item.status !== 'pending') throw new AppError('Only pending requests can be cancelled', 400);
  item.status = 'cancelled';
  item.history.push({ status: 'cancelled', actor: req.user._id });
  await item.save();
  res.json({ success: true, item });
});

module.exports = { list, create, review, cancel };
