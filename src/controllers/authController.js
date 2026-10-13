const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken, signResetToken } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const { sendEmail, branded } = require('../services/emailService');
const { audit } = require('../services/auditService');
const { ROLES } = require('../config/constants');

const register = [
  requireFields(['name', 'email', 'password', 'role']),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, department, studentId, employeeId } = req.body;
    if (!Object.values(ROLES).includes(role)) throw new AppError('Invalid role', 400);
    if (role === 'admin' && req.user?.role !== 'admin') {
      throw new AppError('Only administrators can create admin accounts', 403);
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) throw new AppError('Email already registered', 409);
    const token = crypto.randomBytes(20).toString('hex');
    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' && req.user?.role !== 'admin' ? 'student' : role,
      department,
      studentId,
      employeeId,
      emailVerifyToken: token
    });
    const verifyLink = `${process.env.APP_URL || ''}/#verify?token=${token}`;
    const tpl = branded('Verify your CampusHub email', `Hello ${name}, confirm your email: ${verifyLink}`);
    await sendEmail({ to: user.email, subject: 'Verify your CampusHub account', ...tpl });
    await audit(req, 'user.register', 'User', user._id);
    res.status(201).json({ success: true, message: 'Registered. Check email if SMTP is configured.', user: user.toSafeJSON() });
  })
];

const login = [
  requireFields(['email', 'password']),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) throw new AppError('Account is deactivated', 403);
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
    const token = signToken(user);
    res.json({ success: true, token, user: user.toSafeJSON() });
  })
];

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'bloodGroup', 'notificationPrefs', 'headline'];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true });
  res.json({ success: true, user });
});

const changePassword = [
  requireFields(['currentPassword', 'newPassword']),
  asyncHandler(async (req, res) => {
    if (req.body.newPassword.length < 8) throw new AppError('Password must be at least 8 characters', 400);
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) throw new AppError('Current password is incorrect', 400);
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  })
];

const forgotPassword = [
  requireFields(['email']),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (user) {
      const token = signResetToken(user);
      const link = `${process.env.APP_URL || ''}/#reset?token=${token}`;
      const tpl = branded('Reset your password', `Use this link within 30 minutes: ${link}`);
      await sendEmail({ to: user.email, subject: 'CampusHub password reset', ...tpl });
    }
    res.json({ success: true, message: 'If the account exists, a reset email was sent.' });
  })
];

const resetPassword = [
  requireFields(['token', 'newPassword']),
  asyncHandler(async (req, res) => {
    let payload;
    try {
      payload = jwt.verify(req.body.token, process.env.JWT_SECRET);
    } catch {
      throw new AppError('Invalid or expired reset token', 400);
    }
    if (payload.purpose !== 'reset') throw new AppError('Invalid token', 400);
    const user = await User.findById(payload.sub).select('+password');
    if (!user) throw new AppError('User not found', 404);
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  })
];

const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ emailVerifyToken: req.body.token || req.query.token });
  if (!user) throw new AppError('Invalid verification token', 400);
  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save();
  res.json({ success: true, message: 'Email verified' });
});

const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out. Discard the token on the client.' });
});

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout
};
