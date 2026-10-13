const DocumentRequest = require('../models/DocumentRequest');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const User = require('../models/User');
const { notify } = require('../services/notificationService');
const { saveUpload } = require('../services/fileService');
const { audit } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filter = {};
  if (req.user.role === 'student') filter.requester = req.user._id;
  else if (req.user.role === 'faculty') {
    const ids = await User.find({ role: 'student', department: req.user.department }).distinct('_id');
    filter.requester = { $in: ids };
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  const [items, total] = await Promise.all([
    DocumentRequest.find(filter)
      .populate('requester', 'name email')
      .populate('completedDocument', 'originalName')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    DocumentRequest.countDocuments(filter)
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const item = await DocumentRequest.create({
    requester: req.user._id,
    category: req.body.category,
    purpose: req.body.purpose,
    history: [{ status: 'submitted', actor: req.user._id }]
  });
  res.status(201).json({ success: true, item });
});

const update = asyncHandler(async (req, res) => {
  const item = await DocumentRequest.findById(req.params.id);
  if (!item) throw new AppError('Not found', 404);
  if (req.user.role === 'student') throw new AppError('Not authorized', 403);
  if (req.file) item.completedDocument = (await saveUpload(req, req.file, 'private'))._id;
  if (req.body.status) item.status = req.body.status;
  item.reviewer = req.user._id;
  item.reviewComment = req.body.comment;
  item.history.push({ status: item.status, actor: req.user._id, comment: req.body.comment });
  await item.save();
  await notify({
    userId: item.requester,
    title: 'Document request update',
    body: `Your ${item.category} request is ${item.status}.`,
    link: '/#documents',
    type: 'document'
  });
  await audit(req, 'document.update', 'DocumentRequest', item._id);
  res.json({ success: true, item });
});

module.exports = { list, create, update };
