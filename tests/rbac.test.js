const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown } = require('./helpers');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const LeaveRequest = require('../src/models/LeaveRequest');
const Mark = require('../src/models/Marks');
const { Subject, AssessmentType } = require('../src/models/Academic');

let app;
let studentA;
let studentB;
let faculty;
let adminToken;
let studentToken;
let otherToken;

describe('rbac and isolation', () => {
  before(async () => {
    app = await setup();
    const cse = await Department.create({ name: 'CSE', code: 'CSE' });
    const ece = await Department.create({ name: 'ECE', code: 'ECE' });
    const admin = await User.create({ name: 'Admin', email: 'admin@test.edu', password: 'Password1!', role: 'admin' });
    faculty = await User.create({ name: 'Fac', email: 'fac@test.edu', password: 'Password1!', role: 'faculty', department: cse._id });
    studentA = await User.create({ name: 'A', email: 'a@test.edu', password: 'Password1!', role: 'student', department: cse._id });
    studentB = await User.create({ name: 'B', email: 'b@test.edu', password: 'Password1!', role: 'student', department: ece._id });
    const subject = await Subject.create({ name: 'Algo', code: 'CS101', department: cse._id, semester: 1 });
    const at = await AssessmentType.create({ name: 'Quiz', maxMarks: 10 });
    await Mark.create({ student: studentA._id, subject: subject._id, assessmentType: at._id, marksObtained: 9, maxMarks: 10, published: false });
    await Mark.create({ student: studentB._id, subject: subject._id, assessmentType: at._id, marksObtained: 4, maxMarks: 10, published: true });
    await LeaveRequest.create({
      student: studentA._id,
      type: 'casual',
      fromDate: new Date(),
      toDate: new Date(Date.now() + 86400000),
      reason: 'test',
      status: 'pending'
    });
    adminToken = (await request(app).post('/api/auth/login').send({ email: admin.email, password: 'Password1!' })).body.token;
    studentToken = (await request(app).post('/api/auth/login').send({ email: studentA.email, password: 'Password1!' })).body.token;
    otherToken = (await request(app).post('/api/auth/login').send({ email: studentB.email, password: 'Password1!' })).body.token;
  });
  after(teardown);

  it('students cannot list all users', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${studentToken}`);
    assert.equal(res.status, 403);
  });

  it('students only see their own leave', async () => {
    const mine = await request(app).get('/api/leave').set('Authorization', `Bearer ${studentToken}`);
    assert.equal(mine.status, 200);
    assert.equal(mine.body.items.length, 1);
    const other = await request(app).get('/api/leave').set('Authorization', `Bearer ${otherToken}`);
    assert.equal(other.body.items.length, 0);
  });

  it('students cannot review leave', async () => {
    const leaves = await request(app).get('/api/leave').set('Authorization', `Bearer ${adminToken}`);
    const id = leaves.body.items[0]._id;
    const res = await request(app)
      .post(`/api/leave/${id}/review`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'approved' });
    assert.equal(res.status, 403);
  });

  it('unpublished marks are hidden from students', async () => {
    const res = await request(app).get('/api/marks').set('Authorization', `Bearer ${studentToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 0);
  });

  it('student B cannot see student A marks even if published for A later', async () => {
    const res = await request(app).get('/api/marks').set('Authorization', `Bearer ${otherToken}`);
    assert.ok(res.body.items.every((m) => String(m.student?._id || m.student) === String(studentB._id)));
  });

  it('faculty from CSE cannot review ECE student leave', async () => {
    const leave = await LeaveRequest.create({
      student: studentB._id,
      type: 'medical',
      fromDate: new Date(),
      toDate: new Date(Date.now() + 86400000),
      reason: 'ece',
      status: 'pending'
    });
    const facToken = (await request(app).post('/api/auth/login').send({ email: faculty.email, password: 'Password1!' })).body.token;
    const res = await request(app)
      .post(`/api/leave/${leave._id}/review`)
      .set('Authorization', `Bearer ${facToken}`)
      .send({ status: 'approved' });
    assert.equal(res.status, 403);
  });

  it('duplicate leave overlapping dates is rejected', async () => {
    const from = new Date(Date.now() + 10 * 86400000);
    const to = new Date(Date.now() + 12 * 86400000);
    const a = await request(app).post('/api/leave').set('Authorization', `Bearer ${studentToken}`).send({
      type: 'casual',
      fromDate: from,
      toDate: to,
      reason: 'trip'
    });
    assert.equal(a.status, 201);
    const b = await request(app).post('/api/leave').set('Authorization', `Bearer ${studentToken}`).send({
      type: 'casual',
      fromDate: from,
      toDate: to,
      reason: 'again'
    });
    assert.equal(b.status, 409);
  });
});
