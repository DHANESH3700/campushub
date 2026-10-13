const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown } = require('./helpers');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const FileAsset = require('../src/models/FileAsset');
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
