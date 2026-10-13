const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: String,
    tags: [String]
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    body: String,
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    replies: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        body: String,
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const officeContactSchema = new mongoose.Schema(
  {
    office: String,
    email: String,
    phone: String,
    hours: String
  },
  { timestamps: true }
);

module.exports = {
  Faq: mongoose.model('Faq', faqSchema),
  SupportTicket: mongoose.model('SupportTicket', ticketSchema),
  OfficeContact: mongoose.model('OfficeContact', officeContactSchema)
};
