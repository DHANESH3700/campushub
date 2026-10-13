const Issue = require('../models/Issue');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { notify } = require('../services/notificationService');
const { audit } = require('../services/auditService');
const { saveUpload } = require('../services/fileService');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filter = {};
  if (req.user.role === 'student') filter.submittedBy = req.user._id;
  if (req.user.role === 'faculty') {
    filter.$or = [{ assignee: req.user._id }, { department: req.user.department }];
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
  const [items, total] = await Promise.all([
    Issue.find(filter).populate('submittedBy assignee', 'name role').sort(sort).skip(skip).limit(limit),
    Issue.countDocuments(filter)
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const attachments = [];
  if (req.files) {
    for (const f of req.files) attachments.push((await saveUpload(req, f))._id);
  }
  const item = await Issue.create({
    ...req.body,
    submittedBy: req.user._id,
    department: req.user.department,
    attachments,
    history: [{ status: 'submitted', actor: req.user._id }]
  });
  await audit(req, 'issue.create', 'Issue', item._id);
  res.status(201).json({ success: true, item });
});

const update = asyncHandler(async (req, res) => {
  const item = await Issue.findById(req.params.id);
  if (!item) throw new AppError('Not found', 404);
  if (req.user.role === 'student' && String(item.submittedBy) !== String(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }
  if (req.body.assignee) {
    item.assignee = req.body.assignee;
    item.status = 'assigned';
  }
  if (req.body.status) item.status = req.body.status;
  if (req.body.resolutionNote) item.resolutionNote = req.body.resolutionNote;
  if (req.body.comment) {
    item.comments.push({ author: req.user._id, body: req.body.comment });
  }
  item.history.push({ status: item.status, actor: req.user._id, note: req.body.comment });
  await item.save();
  await notify({
    userId: item.submittedBy,
    title: 'Campus issue updated',
    body: `Status is now ${item.status}.`,
    link: '/#issues',
    type: 'issue'
  });
  res.json({ success: true, item });
});

module.exports = { list, create, update };
