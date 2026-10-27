const Department = require('../models/Department');
const Settings = require('../models/Settings');
const { AcademicYear, Subject, Section, AssessmentType } = require('../models/Academic');
const { NotificationTemplate } = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { audit } = require('../services/auditService');

const crud = (Model, name) => ({
  list: asyncHandler(async (req, res) => {
    const items = await Model.find(req.query.department ? { department: req.query.department } : {}).sort('-createdAt');
    res.json({ success: true, items });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Model.create(req.body);
    await audit(req, `${name}.create`, name, item._id);
    res.status(201).json({ success: true, item });
  }),
  update: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) throw new AppError('Not found', 404);
    await audit(req, `${name}.update`, name, item._id);
    res.json({ success: true, item });
  }),
  remove: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) throw new AppError('Not found', 404);
    await audit(req, `${name}.delete`, name, item._id);
    res.json({ success: true });
  })
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne({ key: 'institution' })) || (await Settings.create({ key: 'institution' }));
  res.json({ success: true, settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate({ key: 'institution' }, req.body, { new: true, upsert: true });
  await audit(req, 'settings.update', 'Settings', settings._id);
  res.json({ success: true, settings });
});

module.exports = {
  departments: crud(Department, 'Department'),
  years: crud(AcademicYear, 'AcademicYear'),
  subjects: {
    ...crud(Subject, 'Subject'),
    list: asyncHandler(async (req, res) => {
      const filter = req.user.role === 'faculty'
        ? { department: req.user.department || null }
        : req.query.department
          ? { department: req.query.department }
          : {};
      const items = await Subject.find(filter).sort('-createdAt');
      res.json({ success: true, items });
    })
  },
  sections: crud(Section, 'Section'),
  assessments: crud(AssessmentType, 'AssessmentType'),
  templates: crud(NotificationTemplate, 'NotificationTemplate'),
  getSettings,
  updateSettings
};
