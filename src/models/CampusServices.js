const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: String,
    isbn: String,
    category: String,
    copies: { type: Number, default: 1 },
    available: { type: Number, default: 1 }
  },
  { timestamps: true }
);

const loanSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date, default: Date.now },
    dueAt: Date,
    returnedAt: Date,
    status: { type: String, enum: ['issued', 'reserved', 'returned', 'overdue'], default: 'issued' }
  },
  { timestamps: true }
);

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other', 'any'], default: 'any' },
    rooms: [
      {
        number: String,
        capacity: Number,
        occupied: { type: Number, default: 0 }
      }
    ]
  },
  { timestamps: true }
);

const hostelAppSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
    roomNumber: String,
    type: { type: String, enum: ['application', 'room_change'], default: 'application' },
    reason: String,
    status: { type: String, enum: ['submitted', 'approved', 'rejected', 'allocated'], default: 'submitted' }
  },
  { timestamps: true }
);

const routeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    stops: [String],
    schedule: String,
    vehicle: String,
    driverName: String
  },
  { timestamps: true }
);

const transportRegSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    stop: String,
    status: { type: String, enum: ['requested', 'allocated', 'cancelled'], default: 'requested' }
  },
  { timestamps: true }
);

module.exports = {
  Book: mongoose.model('Book', bookSchema),
  BookLoan: mongoose.model('BookLoan', loanSchema),
  Hostel: mongoose.model('Hostel', hostelSchema),
  HostelApplication: mongoose.model('HostelApplication', hostelAppSchema),
  TransportRoute: mongoose.model('TransportRoute', routeSchema),
  TransportRegistration: mongoose.model('TransportRegistration', transportRegSchema)
};
