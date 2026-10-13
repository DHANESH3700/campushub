const {
  Book,
  BookLoan,
  Hostel,
  HostelApplication,
  TransportRoute,
  TransportRegistration
} = require('../models/CampusServices');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../services/notificationService');

const library = {
  search: asyncHandler(async (req, res) => {
    const filter = req.query.q ? { $or: [{ title: new RegExp(req.query.q, 'i') }, { author: new RegExp(req.query.q, 'i') }, { isbn: req.query.q }] } : {};
    const items = await Book.find(filter).limit(100);
    res.json({ success: true, items });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Book.create({ ...req.body, available: req.body.copies || 1 });
    res.status(201).json({ success: true, item });
  }),
  issue: asyncHandler(async (req, res) => {
    const book = await Book.findById(req.body.book);
    if (!book || book.available < 1) throw new AppError('Book not available', 400);
    book.available -= 1;
    await book.save();
    const dueAt = new Date(Date.now() + 14 * 86400000);
    const item = await BookLoan.create({ book: book._id, user: req.body.user || req.user._id, dueAt, status: 'issued' });
    res.status(201).json({ success: true, item });
  }),
  returnBook: asyncHandler(async (req, res) => {
    const item = await BookLoan.findById(req.params.id);
    if (!item || item.status === 'returned') throw new AppError('Invalid loan', 400);
    item.status = 'returned';
    item.returnedAt = new Date();
    await item.save();
    await Book.findByIdAndUpdate(item.book, { $inc: { available: 1 } });
    res.json({ success: true, item });
  }),
  history: asyncHandler(async (req, res) => {
    const filter = ['admin', 'staff'].includes(req.user.role) ? {} : { user: req.user._id };
    const items = await BookLoan.find(filter).populate('book user').sort('-issuedAt');
    res.json({ success: true, items });
  }),
  reserve: asyncHandler(async (req, res) => {
    const item = await BookLoan.create({ book: req.body.book, user: req.user._id, status: 'reserved' });
    res.status(201).json({ success: true, item });
  })
};

const hostel = {
  list: asyncHandler(async (req, res) => {
    const items = await Hostel.find();
    const apps = req.user.role === 'student' ? await HostelApplication.find({ student: req.user._id }) : await HostelApplication.find().populate('student', 'name');
    res.json({ success: true, items, applications: apps });
  }),
  createHostel: asyncHandler(async (req, res) => {
    const item = await Hostel.create(req.body);
    res.status(201).json({ success: true, item });
  }),
  apply: asyncHandler(async (req, res) => {
    const item = await HostelApplication.create({ ...req.body, student: req.user._id });
    res.status(201).json({ success: true, item });
  }),
  review: asyncHandler(async (req, res) => {
    const item = await HostelApplication.findById(req.params.id);
    if (!item) throw new AppError('Not found', 404);
    item.status = req.body.status;
    item.roomNumber = req.body.roomNumber || item.roomNumber;
    await item.save();
    await notify({
      userId: item.student,
      title: 'Hostel application update',
      body: `Status: ${item.status}`,
      link: '/#hostel',
      type: 'hostel'
    });
    res.json({ success: true, item });
  })
};

const transport = {
  list: asyncHandler(async (req, res) => {
    const items = await TransportRoute.find();
    const regs =
      req.user.role === 'student'
        ? await TransportRegistration.find({ student: req.user._id }).populate('route')
        : await TransportRegistration.find().populate('route student');
    res.json({ success: true, items, registrations: regs });
  }),
  createRoute: asyncHandler(async (req, res) => {
    const item = await TransportRoute.create(req.body);
    res.status(201).json({ success: true, item });
  }),
  register: asyncHandler(async (req, res) => {
    const item = await TransportRegistration.create({ student: req.user._id, route: req.body.route, stop: req.body.stop });
    res.status(201).json({ success: true, item });
  }),
  allocate: asyncHandler(async (req, res) => {
    const item = await TransportRegistration.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, item });
  })
};

module.exports = { library, hostel, transport };
