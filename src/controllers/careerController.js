const CareerProfile = require('../models/Career');
const { Company, Opportunity, PlacementApplication } = require('../models/Placement');
const { Scholarship, ScholarshipApplication } = require('../models/Scholarship');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { saveUpload } = require('../services/fileService');
const { notify } = require('../services/notificationService');
const { audit } = require('../services/auditService');

const career = {
  get: asyncHandler(async (req, res) => {
    const student = req.user.role === 'student' ? req.user._id : req.query.student;
    const profile = (await CareerProfile.findOne({ student }).populate('currentResume resumeVersions.file')) || { student, skills: [] };
    const completeness = (() => {
      const p = profile.toObject ? profile.toObject() : profile;
      const checks = [p.headline, p.skills?.length, p.education?.length, p.projects?.length, p.currentResume];
      return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    })();
    res.json({ success: true, profile, completeness });
  }),
  update: asyncHandler(async (req, res) => {
    const profile = await CareerProfile.findOneAndUpdate({ student: req.user._id }, { $set: req.body }, { upsert: true, new: true });
    res.json({ success: true, profile });
  }),
  resume: asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('Resume file required', 400);
    const file = await saveUpload(req, req.file, 'private');
    const profile = await CareerProfile.findOneAndUpdate(
      { student: req.user._id },
      { $push: { resumeVersions: { file: file._id, label: req.body.label || req.file.originalname } }, currentResume: file._id },
      { upsert: true, new: true }
    );
    res.json({ success: true, profile });
  })
};

const placements = {
  companies: asyncHandler(async (req, res) => {
    const items = await Company.find().sort('name');
    res.json({ success: true, items });
  }),
  createCompany: asyncHandler(async (req, res) => {
    const item = await Company.create(req.body);
    await audit(req, 'company.create', 'Company', item._id);
    res.status(201).json({ success: true, item });
  }),
  opportunities: asyncHandler(async (req, res) => {
    const { page, limit, skip, sort } = parsePagination(req.query);
    const filter = {};
    if (req.user.role === 'student') filter.published = true;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
    const [items, total] = await Promise.all([
      Opportunity.find(filter).populate('company').sort(sort).skip(skip).limit(limit),
      Opportunity.countDocuments(filter)
    ]);
    res.json({ success: true, ...paginated(items, total, page, limit) });
  }),
  createOpportunity: asyncHandler(async (req, res) => {
    const item = await Opportunity.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, item });
  }),
  apply: asyncHandler(async (req, res) => {
    const opp = await Opportunity.findById(req.params.id);
    if (!opp || !opp.published) throw new AppError('Opportunity not found', 404);
    if (opp.deadline && new Date() > opp.deadline) throw new AppError('Deadline passed', 400);
    if (opp.minCgpa && (req.user.cgpa || 0) < opp.minCgpa) throw new AppError('CGPA below eligibility', 400);
    if (opp.departments?.length && !opp.departments.some((d) => String(d) === String(req.user.department))) {
      throw new AppError('Department not eligible', 400);
    }
    let resume = req.body.resume;
    if (req.file) resume = (await saveUpload(req, req.file, 'private'))._id;
    try {
      const item = await PlacementApplication.create({
        opportunity: opp._id,
        student: req.user._id,
        resume,
        coverNote: req.body.coverNote,
        history: [{ status: 'applied', actor: req.user._id }]
      });
      res.status(201).json({ success: true, item });
    } catch (e) {
      if (e.code === 11000) throw new AppError('Already applied', 409);
      throw e;
    }
  }),
  applications: asyncHandler(async (req, res) => {
    const filter = req.user.role === 'student' ? { student: req.user._id } : {};
    if (req.query.opportunity) filter.opportunity = req.query.opportunity;
    const items = await PlacementApplication.find(filter).populate('student opportunity');
    res.json({ success: true, items });
  }),
  updateApplication: asyncHandler(async (req, res) => {
    const item = await PlacementApplication.findById(req.params.id);
    if (!item) throw new AppError('Not found', 404);
    if (req.body.status) {
      item.status = req.body.status;
      item.history.push({ status: req.body.status, actor: req.user._id });
    }
    if (req.body.interview) item.interviews.push(req.body.interview);
    await item.save();
    await notify({
      userId: item.student,
      title: 'Placement update',
      body: `Application status: ${item.status}`,
      link: '/#placements',
      type: 'placement'
    });
    res.json({ success: true, item });
  })
};

const scholarships = {
  list: asyncHandler(async (req, res) => {
    const filter = req.user.role === 'student' ? { published: true } : {};
    if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
    const items = await Scholarship.find(filter).sort('deadline');
    res.json({ success: true, items });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Scholarship.create(req.body);
    res.status(201).json({ success: true, item });
  }),
  apply: asyncHandler(async (req, res) => {
    const docs = [];
    if (req.files) for (const f of req.files) docs.push((await saveUpload(req, f, 'private'))._id);
    try {
      const item = await ScholarshipApplication.create({
        scholarship: req.params.id,
        student: req.user._id,
        statement: req.body.statement,
        documents: docs
      });
      res.status(201).json({ success: true, item });
    } catch (e) {
      if (e.code === 11000) throw new AppError('Already applied', 409);
      throw e;
    }
  }),
  applications: asyncHandler(async (req, res) => {
    const filter = req.user.role === 'student' ? { student: req.user._id } : {};
    const items = await ScholarshipApplication.find(filter).populate('scholarship student');
    res.json({ success: true, items });
  }),
  review: asyncHandler(async (req, res) => {
    const item = await ScholarshipApplication.findByIdAndUpdate(
      req.params.appId,
      { status: req.body.status, reviewComment: req.body.comment },
      { new: true }
    );
    await notify({
      userId: item.student,
      title: 'Scholarship update',
      body: `Your application is ${item.status}`,
      link: '/#scholarships',
      type: 'scholarship'
    });
    res.json({ success: true, item });
  })
};

module.exports = { career, placements, scholarships };
