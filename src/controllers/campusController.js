const { CampusEvent, EventRegistration, Announcement } = require('../models/Event');
const { Notification } = require('../models/Notification');
const { Club, ClubMembership, ClubPost } = require('../models/Club');
const Achievement = require('../models/Achievement');
const { Poll, PollResponse } = require('../models/Poll');
const { Faq, SupportTicket, OfficeContact } = require('../models/Support');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { notify } = require('../services/notificationService');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const User = require('../models/User');

const events = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip, sort } = parsePagination(req.query);
    const filter = { archived: false };
    if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
    const [items, total] = await Promise.all([
      CampusEvent.find(filter).sort(sort).skip(skip).limit(limit),
      CampusEvent.countDocuments(filter)
    ]);
    const mine = await EventRegistration.find({ user: req.user._id, status: 'registered' });
    res.json({ success: true, ...paginated(items, total, page, limit), registeredIds: mine.map((m) => String(m.event)) });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await CampusEvent.create({ ...req.body, organizer: req.user._id });
    res.status(201).json({ success: true, item });
  }),
  register: asyncHandler(async (req, res) => {
    const event = await CampusEvent.findById(req.params.id);
    if (!event || event.archived) throw new AppError('Event not found', 404);
    if (event.registrationDeadline && new Date() > event.registrationDeadline) throw new AppError('Registration closed', 400);
    if (event.capacity) {
      const count = await EventRegistration.countDocuments({ event: event._id, status: 'registered' });
      if (count >= event.capacity) throw new AppError('Event is full', 409);
    }
    try {
      const item = await EventRegistration.create({ event: event._id, user: req.user._id });
      await notify({
        userId: req.user._id,
        title: 'Event registration confirmed',
        body: `You registered for ${event.title}`,
        link: '/#events',
        type: 'event'
      });
      res.status(201).json({ success: true, item });
    } catch (e) {
      if (e.code === 11000) throw new AppError('Already registered', 409);
      throw e;
    }
  }),
  cancel: asyncHandler(async (req, res) => {
    const item = await EventRegistration.findOneAndUpdate(
      { event: req.params.id, user: req.user._id },
      { status: 'cancelled' },
      { new: true }
    );
    res.json({ success: true, item });
  })
};

const announcements = {
  list: asyncHandler(async (req, res) => {
    const filter = { published: true, archived: false };
    const items = await Announcement.find(filter).sort('-createdAt').limit(50);
    res.json({ success: true, items });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Announcement.create({ ...req.body, author: req.user._id });
    res.status(201).json({ success: true, item });
  })
};

const notifications = {
  list: asyncHandler(async (req, res) => {
    const items = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(100);
    res.json({ success: true, items, unread: items.filter((i) => !i.read).length });
  }),
  read: asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, _id: req.body.ids || req.params.id }, { read: true });
    res.json({ success: true });
  }),
  readAll: asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id }, { read: true });
    res.json({ success: true });
  })
};

const clubs = {
  list: asyncHandler(async (req, res) => {
    const items = await Club.find({ isActive: true }).populate('coordinator', 'name');
    const mine = await ClubMembership.find({ user: req.user._id });
    res.json({ success: true, items, memberships: mine });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Club.create(req.body);
    res.status(201).json({ success: true, item });
  }),
  join: asyncHandler(async (req, res) => {
    const item = await ClubMembership.findOneAndUpdate(
      { club: req.params.id, user: req.user._id },
      { status: 'requested' },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, item });
  }),
  review: asyncHandler(async (req, res) => {
    const item = await ClubMembership.findByIdAndUpdate(req.params.membershipId, { status: req.body.status }, { new: true });
    res.json({ success: true, item });
  }),
  post: asyncHandler(async (req, res) => {
    const item = await ClubPost.create({ ...req.body, club: req.params.id, author: req.user._id });
    res.status(201).json({ success: true, item });
  }),
  posts: asyncHandler(async (req, res) => {
    const items = await ClubPost.find({ club: req.params.id }).sort('-createdAt');
    res.json({ success: true, items });
  })
};

const achievements = {
  list: asyncHandler(async (req, res) => {
    const filter = req.user.role === 'student' ? { student: req.user._id } : {};
    if (req.query.verified) filter.verified = req.query.verified === 'true';
    const items = await Achievement.find(filter).populate('student', 'name department');
    res.json({ success: true, items });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Achievement.create({ ...req.body, student: req.user._id });
    res.status(201).json({ success: true, item });
  }),
  verify: asyncHandler(async (req, res) => {
    const item = await Achievement.findByIdAndUpdate(
      req.params.id,
      { verified: true, verifiedBy: req.user._id },
      { new: true }
    );
    res.json({ success: true, item });
  })
};

const polls = {
  list: asyncHandler(async (req, res) => {
    const items = await Poll.find().sort('-createdAt');
    res.json({ success: true, items });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Poll.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, item });
  }),
  respond: asyncHandler(async (req, res) => {
    const poll = await Poll.findById(req.params.id);
    if (!poll) throw new AppError('Not found', 404);
    const payload = { poll: poll._id, answers: req.body.answers };
    if (!poll.anonymous) payload.user = req.user._id;
    try {
      const item = await PollResponse.create(payload);
      res.status(201).json({ success: true, item });
    } catch (e) {
      if (e.code === 11000) throw new AppError('Already submitted', 409);
      throw e;
    }
  }),
  results: asyncHandler(async (req, res) => {
    if (!['admin', 'faculty'].includes(req.user.role)) throw new AppError('Not authorized', 403);
    const responses = await PollResponse.find({ poll: req.params.id });
    res.json({ success: true, count: responses.length, responses: responses.map((r) => ({ answers: r.answers, anonymous: !r.user })) });
  })
};

const support = {
  faqs: asyncHandler(async (req, res) => {
    const filter = req.query.q ? { $or: [{ question: new RegExp(req.query.q, 'i') }, { answer: new RegExp(req.query.q, 'i') }] } : {};
    const items = await Faq.find(filter);
    const contacts = await OfficeContact.find();
    res.json({ success: true, items, contacts });
  }),
  tickets: asyncHandler(async (req, res) => {
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    const items = await SupportTicket.find(filter).sort('-createdAt');
    res.json({ success: true, items });
  }),
  createTicket: asyncHandler(async (req, res) => {
    const item = await SupportTicket.create({ user: req.user._id, subject: req.body.subject, body: req.body.body });
    res.status(201).json({ success: true, item });
  }),
  createFaq: asyncHandler(async (req, res) => {
    const item = await Faq.create(req.body);
    res.status(201).json({ success: true, item });
  })
};

const studentId = {
  mine: asyncHandler(async (req, res) => {
    if (req.user.role !== 'student' && req.user.role !== 'admin') throw new AppError('Not a student ID', 403);
    const target = req.query.userId && req.user.role === 'admin' ? await User.findById(req.query.userId) : req.user;
    const token = jwt.sign({ sub: target._id.toString(), purpose: 'student-id' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const verifyUrl = `${process.env.APP_URL || ''}/api/id/verify`;
    const qrPayload = JSON.stringify({ t: token });
    const qr = await QRCode.toDataURL(qrPayload);
    res.json({
      success: true,
      card: {
        name: target.name,
        studentId: target.studentId,
        department: target.department,
        semester: target.semester,
        section: target.section,
        isActive: target.isActive,
        qr,
        verifyUrl
      }
    });
  }),
  verify: asyncHandler(async (req, res) => {
    const token = req.body.token || req.query.token;
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new AppError('Invalid ID token', 400);
    }
    if (payload.purpose !== 'student-id') throw new AppError('Invalid ID token', 400);
    const user = await User.findById(payload.sub).select('name studentId isActive role department semester');
    if (!user || !user.isActive) throw new AppError('ID is deactivated', 400);
    res.json({ success: true, valid: true, name: user.name, studentId: user.studentId, role: user.role });
  })
};

module.exports = { events, announcements, notifications, clubs, achievements, polls, support, studentId };
