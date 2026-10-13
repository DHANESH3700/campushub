const { Faq } = require('../models/Support');
const { Announcement, CampusEvent } = require('../models/Event');
const Resource = require('../models/Resource');

const WORKFLOWS = [
  { q: 'leave', a: 'Open Leave from the sidebar, choose type and dates, attach a document if needed, then submit. Faculty or admin will review it.' },
  { q: 'complaint issue', a: 'Use Campus Issues to report infrastructure or other problems. Add location, priority, and photos. You can track status from the same page.' },
  { q: 'document certificate', a: 'Go to Documents, pick a certificate type, describe the purpose, and submit. You will be notified when the file is ready to download.' },
  { q: 'attendance', a: 'Students can view percentages under Attendance. Faculty mark class attendance from the same module. Warnings appear if you fall below the institution threshold.' },
  { q: 'assignment', a: 'Open Assignments to see deadlines. Submit a file before the due date. Late uploads are allowed only if the faculty enabled them.' },
  { q: 'placement internship', a: 'Check Placements for eligible jobs and internships, then apply with your current resume from Career Profile.' },
  { q: 'scholarship', a: 'Scholarships lists open awards. Apply with a statement and supporting files before the deadline.' },
  { q: 'id card', a: 'Your Digital ID is on the Student ID page. Staff can verify the QR code without exposing extra private data.' }
];

async function answer(user, message) {
  const text = (message || '').toLowerCase();
  const hit = WORKFLOWS.find((w) => w.q.split(' ').some((k) => text.includes(k)));
  const faqs = await Faq.find({ $or: [{ question: new RegExp(message, 'i') }, { tags: message }] }).limit(3);
  const announcements = await Announcement.find({ published: true, archived: false }).sort('-createdAt').limit(3);
  const events = await CampusEvent.find({ published: true, archived: false, start: { $gte: new Date() } })
    .sort('start')
    .limit(3);
  let resources = [];
  if (['resource', 'notes', 'paper', 'material'].some((k) => text.includes(k))) {
    resources = await Resource.find({ archived: false }).limit(5).select('title type semester');
  }
  if (process.env.OPENAI_API_KEY) {
    // Optional: kept server-side only. Default path remains rule-based so the app works offline from AI vendors.
  }
  return {
    reply:
      hit?.a ||
      (faqs[0] ? faqs[0].answer : 'I can help you find leave, issues, documents, attendance, assignments, placements, and FAQs. Ask about a specific workflow.'),
    faqs,
    announcements: user ? announcements : [],
    events: user ? events : [],
    resources: user ? resources : [],
    disclaimer: 'The assistant only uses authorized CampusHub data and never invents marks or private records.'
  };
}

module.exports = { answer };
