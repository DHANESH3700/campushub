const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown } = require('./helpers');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const FileAsset = require('../src/models/FileAsset');
const { Subject } = require('../src/models/Academic');
const { TimetableSlot } = require('../src/models/Timetable');
const { Company, Opportunity } = require('../src/models/Placement');
const { CampusEvent } = require('../src/models/Event');
const DocumentRequest = require('../src/models/DocumentRequest');
const fs = require('node:fs');
const path = require('node:path');
const { uploadRoot } = require('../src/middleware/upload');

let app;
let studentToken;
let officerToken;
let adminToken;
let student;

describe('workflows', () => {
  before(async () => {
    app = await setup();
    const cse = await Department.create({ name: 'CSE', code: 'CSE' });
    const admin = await User.create({ name: 'Admin', email: 'admin@test.edu', password: 'Password1!', role: 'admin' });
    const officer = await User.create({ name: 'PO', email: 'po@test.edu', password: 'Password1!', role: 'placement_officer' });
    student = await User.create({
      name: 'Stu',
      email: 'stu@test.edu',
      password: 'Password1!',
      role: 'student',
      department: cse._id,
      cgpa: 8,
      studentId: 'S1'
    });
    adminToken = (await request(app).post('/api/auth/login').send({ email: admin.email, password: 'Password1!' })).body.token;
    officerToken = (await request(app).post('/api/auth/login').send({ email: officer.email, password: 'Password1!' })).body.token;
    studentToken = (await request(app).post('/api/auth/login').send({ email: student.email, password: 'Password1!' })).body.token;
  });
  after(teardown);

  it('students cannot publish opportunities', async () => {
    const res = await request(app)
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'x', type: 'job', company: '000000000000000000000000' });
    assert.equal(res.status, 403);
  });

  it('placement apply and duplicate prevention', async () => {
    const company = await Company.create({ name: 'Acme' });
    const job = await Opportunity.create({ company: company._id, title: 'Intern', type: 'internship', published: true, minCgpa: 7 });
    const a = await request(app).post(`/api/opportunities/${job._id}/apply`).set('Authorization', `Bearer ${studentToken}`).send({ coverNote: 'hi' });
    assert.equal(a.status, 201);
    const b = await request(app).post(`/api/opportunities/${job._id}/apply`).set('Authorization', `Bearer ${studentToken}`).send({});
    assert.equal(b.status, 409);
    const upd = await request(app)
      .patch(`/api/placement-applications/${a.body.item._id}`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ status: 'shortlisted' });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.item.status, 'shortlisted');
  });

  it('event capacity and duplicate registration', async () => {
    const ev = await CampusEvent.create({ title: 'Talk', start: new Date(Date.now() + 86400000), capacity: 1, published: true });
    const a = await request(app).post(`/api/events/${ev._id}/register`).set('Authorization', `Bearer ${studentToken}`).send({});
    assert.equal(a.status, 201);
    const dup = await request(app).post(`/api/events/${ev._id}/register`).set('Authorization', `Bearer ${studentToken}`).send({});
    assert.equal(dup.status, 409);
  });

  it('creates and updates timetable slots using the subject department', async () => {
    const department = await Department.findOne({ code: 'CSE' });
    const faculty = await User.create({
      name: 'Timetable Faculty',
      email: 'timetable-faculty@test.edu',
      password: 'Password1!',
      role: 'faculty',
      department: department._id
    });
    const subject = await Subject.create({ name: 'Timetable Testing', code: 'TT101', department: department._id });
    const otherDepartment = await Department.create({ name: 'Other Department', code: 'OTH' });
    const otherSubject = await Subject.create({ name: 'Other Department Subject', code: 'OTH101', department: otherDepartment._id });
    const facultyToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: faculty.email, password: 'Password1!' })).body.token;

    const scopedSubjects = await request(app)
      .get(`/api/subjects?department=${otherDepartment._id}`)
      .set('Authorization', `Bearer ${facultyToken}`);
    assert.equal(scopedSubjects.status, 200);
    assert.deepEqual(scopedSubjects.body.items.map((item) => item.code), ['TT101']);

    const missingSubject = await request(app)
      .post('/api/timetable')
      .auth(adminToken, { type: 'bearer' })
      .send({ faculty: faculty._id, dayOfWeek: '1', startTime: '09:00', endTime: '10:00' });
    assert.equal(missingSubject.status, 400);
    assert.match(missingSubject.body.message, /select a subject/i);

    const wrongDepartment = await request(app)
      .post('/api/timetable')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ subject: otherSubject._id, dayOfWeek: '1', startTime: '09:00', endTime: '10:00' });
    assert.equal(wrongDepartment.status, 403);
    assert.match(wrongDepartment.body.message, /subject must belong to your department/i);

    const wrongAssignmentDepartment = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ title: 'Other department assignment', subject: otherSubject._id, deadline: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(wrongAssignmentDepartment.status, 403);
    assert.match(wrongAssignmentDepartment.body.message, /subject must belong to your department/i);

    const created = await request(app)
      .post('/api/timetable')
      .auth(adminToken, { type: 'bearer' })
      .send({ subject: subject.code, faculty: faculty._id, dayOfWeek: '1', startTime: '09:00', endTime: '10:00', semester: '2', section: 'A' });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.department, String(department._id));

    const updated = await request(app)
      .patch(`/api/timetable/${created.body.item._id}`)
      .auth(adminToken, { type: 'bearer' })
      .send({ subject: subject._id, faculty: faculty._id, dayOfWeek: '1', startTime: '10:00', endTime: '11:00', classroom: 'Room 2', semester: '2', section: 'A' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.item.startTime, '10:00');
    assert.equal(updated.body.item.classroom, 'Room 2');
    const saved = await TimetableSlot.findById(created.body.item._id);
    assert.equal(String(saved.department), String(department._id));
  });

  it('supports department-scoped subject codes and rejects ambiguous code lookups', async () => {
    const cse = await Department.findOne({ code: 'CSE' });
    const ece = await Department.create({ name: 'Electronics and Communication Engineering', code: 'ECE' });
    const faculty = await User.create({
      name: 'ECE Timetable Faculty',
      email: 'ece-timetable-faculty@test.edu',
      password: 'Password1!',
      role: 'faculty',
      department: ece._id
    });

    await Subject.create({ name: 'Shared Course', code: 'SHARED101', regulation: 'PVP23', department: cse._id });
    await Subject.create({ name: 'Shared Course', code: 'SHARED101', regulation: 'PVP23', department: ece._id });
    await Subject.create({ name: 'Legacy Course', code: 'REG101', regulation: 'PVP21', department: cse._id });
    await Subject.create({ name: 'Current Course', code: 'REG101', regulation: 'PVP23', department: cse._id });
    await assert.rejects(
      Subject.create({ name: 'Duplicate Course', code: 'REG101', regulation: 'PVP23', department: cse._id }),
      (error) => error.code === 11000
    );

    const ambiguous = await request(app)
      .post('/api/timetable')
      .auth(adminToken, { type: 'bearer' })
      .send({ subject: 'SHARED101', faculty: faculty._id, dayOfWeek: '2', startTime: '09:00', endTime: '10:00' });
    assert.equal(ambiguous.status, 400);
    assert.match(ambiguous.body.message, /ambiguous/i);

    const scoped = await request(app)
      .post('/api/timetable')
      .auth(adminToken, { type: 'bearer' })
      .send({
        subject: 'SHARED101',
        department: ece._id,
        faculty: faculty._id,
        dayOfWeek: '2',
        startTime: '09:00',
        endTime: '10:00'
      });
    assert.equal(scoped.status, 201, scoped.body.message);
    assert.equal(String(scoped.body.item.department), String(ece._id));
  });

  it('uploads assignment materials and student submissions', async () => {
    const department = await Department.findOne({ code: 'CSE' });
    const subject = await Subject.create({ name: 'Assignment Testing', code: 'ASG101', department: department._id });
    const assignmentResponse = await request(app)
      .post('/api/assignments')
      .auth(adminToken, { type: 'bearer' })
      .field('title', 'Upload test assignment')
      .field('subject', subject.code)
      .field('deadline', new Date(Date.now() + 86400000).toISOString())
      .attach('file', Buffer.from('assignment material'), {
        filename: 'assignment.pptx',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
    assert.equal(assignmentResponse.status, 201, assignmentResponse.body.message);
    const attachment = await FileAsset.findById(assignmentResponse.body.item.attachment);
    assert.equal(String(attachment.department), String(department._id));
    const attachmentPath = path.join(uploadRoot, attachment.folder, attachment.storedName);

    try {
      const listed = await request(app)
        .get('/api/assignments')
        .auth(studentToken, { type: 'bearer' });
      const studentAssignment = listed.body.items.find((item) => item._id === assignmentResponse.body.item._id);
      assert.equal(studentAssignment.attachment.originalName, 'assignment.pptx');

      const download = await request(app)
        .get(`/api/files/${attachment._id}`)
        .auth(studentToken, { type: 'bearer' });
      assert.equal(download.status, 200);
      assert.equal(fs.readFileSync(attachmentPath, 'utf8'), 'assignment material');

      const submission = await request(app)
        .post(`/api/assignments/${assignmentResponse.body.item._id}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .attach('file', Buffer.from('student work'), { filename: 'submission.pdf', contentType: 'application/pdf' });
      assert.equal(submission.status, 201, submission.body.message);
      const submittedFile = await FileAsset.findById(submission.body.item.file);
      assert.ok(submittedFile);
      fs.unlinkSync(path.join(uploadRoot, submittedFile.folder, submittedFile.storedName));
    } finally {
      if (fs.existsSync(attachmentPath)) fs.unlinkSync(attachmentPath);
    }
  });

  it('file download requires auth and ownership', async () => {
    const asset = await FileAsset.create({
      originalName: 'secret.pdf',
      storedName: 'missing.pdf',
      mimeType: 'application/pdf',
      folder: 'general',
      owner: student._id,
      visibility: 'private'
    });
    const anon = await request(app).get(`/api/files/${asset._id}`);
    assert.equal(anon.status, 401);
    const other = await User.create({ name: 'O', email: 'o@test.edu', password: 'Password1!', role: 'student' });
    const otherTok = (await request(app).post('/api/auth/login').send({ email: other.email, password: 'Password1!' })).body.token;
    const denied = await request(app).get(`/api/files/${asset._id}`).set('Authorization', `Bearer ${otherTok}`);
    assert.equal(denied.status, 403);
    const missing = await request(app).get(`/api/files/${asset._id}`).set('Authorization', `Bearer ${studentToken}`);
    assert.equal(missing.status, 404);
  });

  it('allows a student to download the document attached to their request', async () => {
    const staff = await User.create({ name: 'Staff', email: 'staff@test.edu', password: 'Password1!', role: 'staff' });
    const storedName = `requested-${Date.now()}.txt`;
    const folder = path.join(uploadRoot, 'documents');
    const filePath = path.join(folder, storedName);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(filePath, 'completed student document');

    try {
      const asset = await FileAsset.create({
        originalName: 'transcript.txt',
        storedName,
        mimeType: 'text/plain',
        folder: 'documents',
        owner: staff._id,
        visibility: 'private'
      });
      const docRequest = await DocumentRequest.create({
        requester: student._id,
        category: 'transcript',
        purpose: 'Download test',
        status: 'ready',
        completedDocument: asset._id
      });

      const ownDownload = await request(app)
        .get(`/api/files/${asset._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      assert.equal(ownDownload.status, 200);
      assert.equal(ownDownload.text, 'completed student document');

      const other = await User.create({ name: 'Other', email: 'other@test.edu', password: 'Password1!', role: 'student' });
      const otherToken = (await request(app).post('/api/auth/login').send({ email: other.email, password: 'Password1!' })).body.token;
      const denied = await request(app)
        .get(`/api/files/${asset._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      assert.equal(denied.status, 403);

      const listed = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${studentToken}`);
      assert.equal(listed.body.items.find((item) => item._id === String(docRequest._id)).completedDocument.originalName, 'transcript.txt');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('student ID verification does not leak extra private fields', async () => {
    const card = await request(app).get('/api/id').set('Authorization', `Bearer ${studentToken}`);
    assert.equal(card.status, 200);
    assert.ok(card.body.card.qr.startsWith('data:image'));
    const signed = jwt.sign({ sub: student._id.toString(), purpose: 'student-id' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const ver = await request(app).post('/api/id/verify').send({ token: signed });
    assert.equal(ver.status, 200);
    assert.equal(ver.body.valid, true);
    assert.equal(ver.body.address, undefined);
    assert.equal(ver.body.cgpa, undefined);

    const dash = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${studentToken}`);
    assert.equal(dash.status, 200);
    assert.equal(dash.body.dashboard.role, 'student');
  });

  it('assistant stays on documented workflows', async () => {
    const res = await request(app).post('/api/assistant').set('Authorization', `Bearer ${studentToken}`).send({ message: 'How do I apply for leave?' });
    assert.equal(res.status, 200);
    assert.match(res.body.reply, /leave/i);
  });
});
