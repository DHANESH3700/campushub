const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { audit } = require('../services/auditService');

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.q) filter.$or = [{ name: new RegExp(req.query.q, 'i') }, { email: new RegExp(req.query.q, 'i') }];
  if (req.user.role === 'faculty') filter.department = req.user.department;
  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).populate('department', 'name code'),
    User.countDocuments(filter)
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('department');
  if (!user) throw new AppError('User not found', 404);
  if (req.user.role === 'student' && String(req.user._id) !== String(user._id)) {
    throw new AppError('Not authorized', 403);
  }
  res.json({ success: true, user });
});

const updateUser = asyncHandler(async (req, res) => {
  const allowed = ['name', 'role', 'department', 'isActive', 'semester', 'section', 'graduationYear', 'cgpa', 'staffArea', 'phone'];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
  const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404);
  await audit(req, 'user.update', 'User', user._id, patch);
  res.json({ success: true, user });
});

module.exports = { listUsers, getUser, updateUser };
