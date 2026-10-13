const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function signResetToken(user) {
  return jwt.sign({ sub: user._id.toString(), purpose: 'reset' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_RESET_EXPIRES_IN || '30m'
  });
}

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Authentication required', 401);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired session', 401);
  }
  const user = await User.findById(payload.sub).select('-password');
  if (!user || !user.isActive) throw new AppError('Account is inactive or not found', 401);
  req.user = user;
  next();
});

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}

function sameDepartmentOrAdmin(recordDepartment) {
  if (!recordDepartment) return true;
  if (['admin', 'placement_officer'].includes(this.role)) return true;
  return String(this.department) === String(recordDepartment);
}

module.exports = { signToken, signResetToken, protect, authorize, sameDepartmentOrAdmin };
