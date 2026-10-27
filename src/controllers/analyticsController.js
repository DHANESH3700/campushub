const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Issue = require('../models/Issue');
const { PlacementApplication, Opportunity } = require('../models/Placement');
const Resource = require('../models/Resource');
const { EventRegistration } = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const Mark = require('../models/Marks');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { toCsv } = require('../utils/csv');
const { createReportPdf } = require('../services/pdfService');

const summary = asyncHandler(async (req, res) => {
  if (!['admin', 'faculty', 'placement_officer'].includes(req.user.role)) throw new AppError('Not authorized', 403);
  const byStatus = async (Model, field = 'status') => Model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  const attendance = await byStatus(Attendance);
  const leaves = await byStatus(LeaveRequest);
  const issues = await byStatus(Issue);
  const placements = await byStatus(PlacementApplication);
  const resources = await Resource.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, downloads: { $sum: '$downloads' } } }]);
  const events = await EventRegistration.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const marks = await Mark.aggregate([
    { $match: { published: true } },
    { $group: { _id: '$subject', avg: { $avg: '$marksObtained' }, n: { $sum: 1 } } }
  ]);
  const jobs = await Opportunity.countDocuments({ published: true });
  res.json({ success: true, attendance, leaves, issues, placements, resources, events, marks, jobs });
});

const audit = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new AppError('Not authorized', 403);
  const items = await AuditLog.find().sort('-createdAt').limit(200).populate('actor', 'name email role');
  if (req.query.format === 'csv') {
    return res.type('text/csv').send(
      toCsv(items, [
        { label: 'Time', value: (r) => r.createdAt.toISOString() },
        { label: 'Actor', value: (r) => r.actor?.email },
        { label: 'Action', value: 'action' },
        { label: 'Entity', value: 'entity' }
      ])
    );
  }
  if (req.query.format === 'pdf') {
    return createReportPdf(res, 'Audit report', items, [
      { label: 'Time', value: (r) => r.createdAt.toISOString() },
      { label: 'Actor', value: (r) => r.actor?.email },
      { label: 'Action', value: 'action' },
      { label: 'Entity', value: 'entity' }
    ]);
  }
  if (req.query.format) throw new AppError('Unsupported report format', 400);
  res.json({ success: true, items });
});

module.exports = { summary, audit };
