const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { upload, setFolder } = require('../middleware/upload');
const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const admin = require('../controllers/adminController');
const leave = require('../controllers/leaveController');
const issues = require('../controllers/issueController');
const documents = require('../controllers/documentController');
const ops = require('../controllers/academicOpsController');
const campus = require('../controllers/campusController');
const career = require('../controllers/careerController');
const services = require('../controllers/servicesController');
const dashboard = require('../controllers/dashboardController');
const analytics = require('../controllers/analyticsController');
const files = require('../controllers/fileController');
const assistant = require('../controllers/assistantController');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true, service: 'campushub', time: new Date().toISOString() }));

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/forgot', auth.forgotPassword);
router.post('/auth/reset', auth.resetPassword);
router.post('/auth/verify', auth.verifyEmail);
router.get('/id/verify', campus.studentId.verify);
router.post('/id/verify', campus.studentId.verify);

router.use(protect);
router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);
router.patch('/auth/profile', auth.updateProfile);
router.post('/auth/password', auth.changePassword);

router.get('/dashboard', dashboard.overview);
router.get('/notifications', campus.notifications.list);
router.post('/notifications/read-all', campus.notifications.readAll);
router.post('/notifications/:id/read', campus.notifications.read);

router.get('/users', authorize('admin', 'faculty', 'placement_officer', 'staff'), users.listUsers);
router.get('/users/:id', users.getUser);
router.patch('/users/:id', authorize('admin'), users.updateUser);

router.get('/departments', admin.departments.list);
router.post('/departments', authorize('admin'), admin.departments.create);
router.patch('/departments/:id', authorize('admin'), admin.departments.update);

router.get('/academic-years', admin.years.list);
router.post('/academic-years', authorize('admin'), admin.years.create);
router.get('/subjects', admin.subjects.list);
router.post('/subjects', authorize('admin', 'faculty'), admin.subjects.create);
router.get('/sections', admin.sections.list);
router.post('/sections', authorize('admin'), admin.sections.create);
router.get('/assessment-types', admin.assessments.list);
router.post('/assessment-types', authorize('admin'), admin.assessments.create);
router.get('/settings', admin.getSettings);
router.patch('/settings', authorize('admin'), admin.updateSettings);
router.get('/notification-templates', authorize('admin'), admin.templates.list);
router.post('/notification-templates', authorize('admin'), admin.templates.create);

router.get('/leave', leave.list);
router.post('/leave', setFolder('leave'), upload.single('file'), leave.create);
router.post('/leave/:id/review', authorize('faculty', 'admin'), leave.review);
router.post('/leave/:id/cancel', leave.cancel);

router.get('/issues', issues.list);
router.post('/issues', setFolder('issues'), upload.array('files', 4), issues.create);
router.patch('/issues/:id', issues.update);

router.get('/documents', documents.list);
router.post('/documents', documents.create);
router.patch('/documents/:id', authorize('admin', 'staff'), setFolder('documents'), upload.single('file'), documents.update);

router.get('/resources', ops.resources.list);
router.post('/resources', authorize('faculty', 'admin'), setFolder('resources'), upload.single('file'), ops.resources.create);
router.patch('/resources/:id', authorize('faculty', 'admin'), ops.resources.update);

router.get('/attendance', ops.attendance.list);
router.post('/attendance', authorize('faculty', 'admin'), ops.attendance.record);
router.get('/attendance/report', authorize('admin', 'faculty'), ops.attendance.report);
router.get('/attendance/threshold', ops.threshold);

router.get('/timetable', ops.timetable.list);
router.post('/timetable', authorize('admin', 'faculty'), ops.timetable.create);
router.post('/calendar', authorize('admin', 'faculty'), ops.timetable.calendarCreate);

router.get('/marks', ops.marks.list);
router.post('/marks', authorize('faculty', 'admin'), ops.marks.upsert);

router.get('/assignments', ops.assignments.list);
router.post('/assignments', authorize('faculty', 'admin'), setFolder('assignments'), upload.single('file'), ops.assignments.create);
router.post('/assignments/:id/submit', setFolder('submissions'), upload.single('file'), ops.assignments.submit);
router.post('/submissions/:submissionId/grade', authorize('faculty', 'admin'), ops.assignments.grade);

router.get('/events', campus.events.list);
router.post('/events', authorize('admin', 'faculty'), campus.events.create);
router.post('/events/:id/register', campus.events.register);
router.post('/events/:id/cancel', campus.events.cancel);
router.get('/announcements', campus.announcements.list);
router.post('/announcements', authorize('admin', 'faculty'), campus.announcements.create);

router.get('/career', career.career.get);
router.patch('/career', career.career.update);
router.post('/career/resume', setFolder('resumes'), upload.single('file'), career.career.resume);

router.get('/companies', career.placements.companies);
router.post('/companies', authorize('admin', 'placement_officer'), career.placements.createCompany);
router.get('/opportunities', career.placements.opportunities);
router.post('/opportunities', authorize('admin', 'placement_officer'), career.placements.createOpportunity);
router.post('/opportunities/:id/apply', setFolder('resumes'), upload.single('file'), career.placements.apply);
router.get('/placement-applications', career.placements.applications);
router.patch('/placement-applications/:id', authorize('admin', 'placement_officer'), career.placements.updateApplication);

router.get('/scholarships', career.scholarships.list);
router.post('/scholarships', authorize('admin'), career.scholarships.create);
router.post('/scholarships/:id/apply', setFolder('scholarships'), upload.array('files', 4), career.scholarships.apply);
router.get('/scholarship-applications', career.scholarships.applications);
router.patch('/scholarship-applications/:appId', authorize('admin'), career.scholarships.review);

router.get('/clubs', campus.clubs.list);
router.post('/clubs', authorize('admin', 'faculty'), campus.clubs.create);
router.post('/clubs/:id/join', campus.clubs.join);
router.patch('/clubs/memberships/:membershipId', authorize('admin', 'faculty'), campus.clubs.review);
router.get('/clubs/:id/posts', campus.clubs.posts);
router.post('/clubs/:id/posts', authorize('admin', 'faculty'), campus.clubs.post);

router.get('/achievements', campus.achievements.list);
router.post('/achievements', campus.achievements.create);
router.post('/achievements/:id/verify', authorize('admin', 'faculty'), campus.achievements.verify);

router.get('/polls', campus.polls.list);
router.post('/polls', authorize('admin', 'faculty'), campus.polls.create);
router.post('/polls/:id/respond', campus.polls.respond);
router.get('/polls/:id/results', campus.polls.results);

router.get('/id', campus.studentId.mine);

router.get('/library', services.library.search);
router.post('/library', authorize('admin', 'staff'), services.library.create);
router.post('/library/issue', authorize('admin', 'staff'), services.library.issue);
router.post('/library/:id/return', authorize('admin', 'staff'), services.library.returnBook);
router.post('/library/reserve', services.library.reserve);
router.get('/library/loans', services.library.history);

router.get('/hostel', services.hostel.list);
router.post('/hostel', authorize('admin', 'staff'), services.hostel.createHostel);
router.post('/hostel/apply', services.hostel.apply);
router.patch('/hostel/:id', authorize('admin', 'staff'), services.hostel.review);

router.get('/transport', services.transport.list);
router.post('/transport', authorize('admin', 'staff'), services.transport.createRoute);
router.post('/transport/register', services.transport.register);
router.patch('/transport/:id', authorize('admin', 'staff'), services.transport.allocate);

router.get('/faqs', campus.support.faqs);
router.post('/faqs', authorize('admin'), campus.support.createFaq);
router.get('/support', campus.support.tickets);
router.post('/support', campus.support.createTicket);

router.post('/assistant', assistant.ask);
router.get('/analytics', analytics.summary);
router.get('/audit', analytics.audit);
router.get('/files/:id', files.download);

module.exports = router;
