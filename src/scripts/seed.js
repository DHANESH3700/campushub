require('dotenv').config();
const mongoose = require('mongoose');
const { connectDb } = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const { AcademicYear, Subject, Section, AssessmentType } = require('../models/Academic');
const Settings = require('../models/Settings');
const { Faq, OfficeContact } = require('../models/Support');
const { Club } = require('../models/Club');
const { CampusEvent, Announcement } = require('../models/Event');
const { Company, Opportunity } = require('../models/Placement');
const { Scholarship } = require('../models/Scholarship');
const { Book, Hostel, TransportRoute } = require('../models/CampusServices');
const { Poll } = require('../models/Poll');
const { CalendarEvent } = require('../models/Timetable');
const LeaveRequest = require('../models/LeaveRequest');
const Issue = require('../models/Issue');
const Attendance = require('../models/Attendance');
const { Assignment } = require('../models/Assignment');

async function seed() {
  await connectDb();
  await mongoose.connection.dropDatabase();

  const cse = await Department.create({ name: 'Computer Science', code: 'CSE', description: 'CSE department' });
  const ece = await Department.create({ name: 'Electronics', code: 'ECE' });
  const year = await AcademicYear.create({ name: '2026-27', isCurrent: true, startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31') });
  const subject = await Subject.create({ name: 'Web Technologies', code: 'CS401', department: cse._id, semester: 4, credits: 4 });
  await Section.create({ name: 'A', department: cse._id, semester: 4, academicYear: year._id });
  const assessment = await AssessmentType.create({ name: 'Internal 1', maxMarks: 50, weightage: 25 });

  const password = 'Admin@12345';
  const admin = await User.create({ name: 'Ada Admin', email: 'admin@campushub.edu', password, role: 'admin', emailVerified: true });
  const faculty = await User.create({
    name: 'Dr. Farah Faculty',
    email: 'faculty@campushub.edu',
    password,
    role: 'faculty',
    department: cse._id,
    employeeId: 'FAC1001',
    emailVerified: true
  });
  subject.faculty = faculty._id;
  await subject.save();
  const student = await User.create({
    name: 'Sam Student',
    email: 'student@campushub.edu',
    password,
    role: 'student',
    department: cse._id,
    studentId: 'STU1001',
    semester: 4,
    section: 'A',
    graduationYear: 2027,
    cgpa: 8.4,
    emailVerified: true
  });
  const student2 = await User.create({
    name: 'Riya Rao',
    email: 'riya@campushub.edu',
    password,
    role: 'student',
    department: ece._id,
    studentId: 'STU2002',
    semester: 4,
    section: 'B',
    graduationYear: 2027,
    cgpa: 7.2,
    emailVerified: true
  });
  await User.create({
    name: 'Priya Placement',
    email: 'placement@campushub.edu',
    password,
    role: 'placement_officer',
    employeeId: 'PLC1001',
    emailVerified: true
  });
  await User.create({
    name: 'Leo Librarian',
    email: 'library@campushub.edu',
    password,
    role: 'staff',
    staffArea: 'library',
    employeeId: 'STF1001',
    emailVerified: true
  });

  await Settings.create({
    key: 'institution',
    institutionName: 'CampusHub College',
    attendanceWarningPercent: 75,
    emailEnabled: false
  });

  await Faq.insertMany([
    { question: 'How do I apply for leave?', answer: 'Open Leave, choose dates and type, then submit. You will be notified after review.', category: 'leave', tags: ['leave'] },
    { question: 'How do I download a bonafide certificate?', answer: 'Submit a document request. When status is ready, download from Documents.', category: 'documents', tags: ['certificate'] },
    { question: 'Why is my attendance flagged?', answer: 'The institution warning threshold is 75% unless changed by an administrator.', category: 'attendance', tags: ['attendance'] }
  ]);
  await OfficeContact.create({ office: 'Academic Office', email: 'office@campushub.edu', phone: '+91-00000-00000', hours: 'Mon–Fri 9:00–16:00' });

  await Club.create({ name: 'Coding Club', description: 'Hackathons and peer learning', coordinator: faculty._id, category: 'technical' });
  await Announcement.create({ title: 'Welcome to CampusHub', body: 'All academic and campus services are now available in one place.', author: admin._id, published: true });
  await CampusEvent.create({
    title: 'Tech Fest 2026',
    description: 'Department exhibitions and talks',
    start: new Date(Date.now() + 7 * 86400000),
    venue: 'Main Auditorium',
    capacity: 200,
    organizer: faculty._id,
    published: true
  });
  await CalendarEvent.create({ title: 'Mid-term week', type: 'exam', start: new Date(Date.now() + 14 * 86400000) });
  await CalendarEvent.create({ title: 'Founders Day', type: 'holiday', start: new Date(Date.now() + 21 * 86400000) });

  const company = await Company.create({ name: 'Nimbus Labs', industry: 'Software', website: 'https://example.com', description: 'Product engineering' });
  await Opportunity.create({
    company: company._id,
    title: 'Graduate Engineer Trainee',
    type: 'job',
    description: 'Full-stack role',
    skills: ['javascript', 'mongodb'],
    minCgpa: 7,
    departments: [cse._id],
    graduationYears: [2027],
    deadline: new Date(Date.now() + 20 * 86400000),
    published: true
  });
  await Scholarship.create({
    title: 'Merit Scholarship',
    description: 'For CGPA above 8',
    eligibility: 'CGPA >= 8',
    benefits: 'INR 25,000',
    deadline: new Date(Date.now() + 30 * 86400000),
    published: true
  });

  await Book.create({ title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', copies: 3, available: 3, category: 'engineering' });
  await Hostel.create({ name: 'Lakeview Hostel', gender: 'any', rooms: [{ number: 'A101', capacity: 2, occupied: 0 }, { number: 'A102', capacity: 2, occupied: 0 }] });
  await TransportRoute.create({ name: 'Route 1 — City Center', stops: ['Campus', 'Market', 'Station'], schedule: '07:30, 16:45', vehicle: 'Bus-12', driverName: 'On file with transport office' });

  await Poll.create({
    title: 'Cafeteria feedback',
    description: 'Help us improve campus dining',
    questions: [{ prompt: 'Are you satisfied with cafeteria hours?', type: 'single', options: ['yes', 'no'] }],
    audience: 'all',
    createdBy: admin._id
  });

  await LeaveRequest.create({
    student: student._id,
    type: 'casual',
    fromDate: new Date(Date.now() + 86400000),
    toDate: new Date(Date.now() + 2 * 86400000),
    reason: 'Family function',
    status: 'pending',
    history: [{ status: 'pending', actor: student._id }]
  });
  await Issue.create({
    title: 'Projector not working',
    description: 'Room CSE-204 projector fails to power on.',
    category: 'classroom',
    location: 'CSE-204',
    priority: 'high',
    submittedBy: student._id,
    department: cse._id,
    status: 'submitted'
  });
  await Attendance.create({
    student: student._id,
    subject: subject._id,
    faculty: faculty._id,
    department: cse._id,
    section: 'A',
    semester: 4,
    date: new Date(),
    status: 'present'
  });
  await Assignment.create({
    title: 'REST API lab',
    instructions: 'Build a small Express API.',
    subject: subject._id,
    department: cse._id,
    semester: 4,
    section: 'A',
    faculty: faculty._id,
    deadline: new Date(Date.now() + 5 * 86400000),
    maxMarks: 20,
    allowLate: true
  });

  console.log('Seed complete.');
  console.log('Demo accounts (password Admin@12345):');
  console.log('  admin@campushub.edu');
  console.log('  faculty@campushub.edu');
  console.log('  student@campushub.edu');
  console.log('  placement@campushub.edu');
  console.log('  library@campushub.edu');
  console.log('IDs:', { student: student._id.toString(), faculty: faculty._id.toString(), subject: subject._id.toString(), assessment: assessment._id.toString(), student2: student2._id.toString() });
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
