const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
  PLACEMENT_OFFICER: 'placement_officer',
  STAFF: 'staff'
};

const STAFF_AREAS = ['library', 'hostel', 'transport', 'office', 'general'];

const LEAVE_TYPES = ['casual', 'medical', 'academic', 'emergency', 'other'];
const REQUEST_STATUS = ['pending', 'approved', 'rejected', 'cancelled', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'excused', 'on_duty'];
const ASSIGNMENT_STATUS = ['pending', 'submitted', 'late', 'graded', 'returned'];
const APPLICATION_STATUS = ['applied', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn', 'placed'];

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

module.exports = {
  ROLES,
  STAFF_AREAS,
  LEAVE_TYPES,
  REQUEST_STATUS,
  PRIORITIES,
  ATTENDANCE_STATUS,
  ASSIGNMENT_STATUS,
  APPLICATION_STATUS,
  ALLOWED_MIME
};
