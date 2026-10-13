const AppError = require('../utils/AppError');

function isAdmin(user) {
  return user.role === 'admin';
}

function assertOwnerOrStaff(user, ownerId, extraRoles = ['admin', 'faculty', 'staff']) {
  if (String(user._id) === String(ownerId)) return;
  if (extraRoles.includes(user.role)) return;
  throw new AppError('Not authorized to access this record', 403);
}

function departmentFilter(user) {
  if (user.role === 'admin' || user.role === 'placement_officer') return {};
  if (user.department) return { department: user.department };
  return {};
}

function studentSelfFilter(user, studentField = 'student') {
  if (user.role === 'student') return { [studentField]: user._id };
  return departmentFilter(user);
}

module.exports = { isAdmin, assertOwnerOrStaff, departmentFilter, studentSelfFilter };
