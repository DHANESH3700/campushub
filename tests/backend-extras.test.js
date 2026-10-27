const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const request = require('supertest');
const webPush = require('web-push');
const { setup, teardown } = require('./helpers');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const { Subject } = require('../src/models/Academic');
const Attendance = require('../src/models/Attendance');
const AuditLog = require('../src/models/AuditLog');
const PushSubscription = require('../src/models/PushSubscription');
const FileAsset = require('../src/models/FileAsset');
const { signToken } = require('../src/middleware/auth');
const objectStorage = require('../src/services/s3Storage');
const { saveUpload } = require('../src/services/fileService');
const { sendPushNotifications } = require('../src/services/pushService');
const { notify } = require('../src/services/notificationService');

let app;
let admin;
let student;
let adminToken;
let studentToken;
let originalVapid;

describe('backend integrations', () => {
  before(async () => {
    originalVapid = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT
    };
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    app = await setup();
    const department = await Department.create({ name: 'Computer Science', code: 'CS' });
    admin = await User.create({ name: 'Admin', email: 'integrations-admin@test.edu', password: 'Password1!', role: 'admin' });
    student = await User.create({ name: 'Student', email: 'integrations-student@test.edu', password: 'Password1!', role: 'student', department: department._id });
    adminToken = signToken(admin);
    studentToken = signToken(student);
    const subject = await Subject.create({ name: 'Backend Systems', code: 'BACK101', department: department._id });
    await Attendance.create({
      student: student._id,
      subject: subject._id,
      department: department._id,
      date: new Date('2026-10-01T00:00:00.000Z'),
      status: 'present'
    });
    await AuditLog.create({ actor: admin._id, action: 'test.export', entity: 'Report' });
  });

  after(async () => {
    await PushSubscription.deleteMany({});
    await teardown();
    for (const [key, value] of Object.entries({
      VAPID_PUBLIC_KEY: originalVapid.publicKey,
      VAPID_PRIVATE_KEY: originalVapid.privateKey,
      VAPID_SUBJECT: originalVapid.subject
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('exports attendance and audit reports as PDF while retaining CSV and JSON formats', async () => {
    const attendancePdf = await request(app)
      .get('/api/attendance/report?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(attendancePdf.status, 200);
    assert.match(attendancePdf.headers['content-type'], /application\/pdf/);
    assert.equal(attendancePdf.body.subarray(0, 4).toString(), '%PDF');

    const auditPdf = await request(app)
      .get('/api/audit?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(auditPdf.status, 200);
    assert.match(auditPdf.headers['content-type'], /application\/pdf/);
    assert.equal(auditPdf.body.subarray(0, 4).toString(), '%PDF');

    const attendanceCsv = await request(app)
      .get('/api/attendance/report')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.match(attendanceCsv.headers['content-type'], /text\/csv/);
    const auditJson = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`);
    assert.equal(auditJson.body.success, true);
  });

  it('stores and streams private uploads through S3 when enabled', async () => {
    const originalEnv = {
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
      S3_BUCKET: process.env.S3_BUCKET,
      S3_REGION: process.env.S3_REGION,
      S3_ENDPOINT: process.env.S3_ENDPOINT,
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
      S3_SECRET_KEY: process.env.S3_SECRET_KEY
    };
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campushub-s3-'));
    const sourceFile = path.join(tempDir, 'upload.txt');
    const content = 'stored in object storage';
    fs.writeFileSync(sourceFile, content);
    process.env.STORAGE_PROVIDER = 's3';
    process.env.S3_BUCKET = 'campushub-test';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    delete process.env.S3_ACCESS_KEY;
    delete process.env.S3_SECRET_KEY;

    const client = objectStorage.getClient();
    const originalSend = client.send;
    const sentCommands = [];
    client.send = async (command) => {
      sentCommands.push(command);
      if (command.constructor.name === 'PutObjectCommand') {
        const chunks = [];
        for await (const chunk of command.input.Body) chunks.push(chunk);
        assert.equal(Buffer.concat(chunks).toString(), content);
        return {};
      }
      if (command.constructor.name === 'GetObjectCommand') {
        return { Body: Readable.from([Buffer.from(content)]), ContentLength: Buffer.byteLength(content) };
      }
      return {};
    };

    try {
      const asset = await saveUpload(
        { user: student, uploadFolder: 'test-files' },
        {
          path: sourceFile,
          filename: 'opaque-name.txt',
          originalname: 'original.txt',
          mimetype: 'text/plain',
          size: Buffer.byteLength(content)
        }
      );
      assert.equal(asset.storageProvider, 's3');
      assert.equal(asset.storageBucket, 'campushub-test');
      assert.equal(asset.storedName, 'test-files/opaque-name.txt');
      assert.equal(fs.existsSync(sourceFile), false);
      assert.equal(sentCommands[0].constructor.name, 'PutObjectCommand');

      const download = await request(app)
        .get(`/api/files/${asset._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      assert.equal(download.status, 200);
      assert.equal(download.text, content);
      assert.equal(sentCommands[1].constructor.name, 'GetObjectCommand');
    } finally {
      client.send = originalSend;
      fs.rmSync(tempDir, { recursive: true, force: true });
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('only permits authenticated users to manage valid browser push subscriptions', async () => {
    const missingConfig = await request(app)
      .post('/api/notifications/push-subscription')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    assert.equal(missingConfig.status, 503);

    const keys = webPush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    process.env.VAPID_SUBJECT = 'mailto:admin@campushub.local';

    const config = await request(app)
      .get('/api/notifications/push-config')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(config.body.enabled, true);
    assert.equal(config.body.publicKey, keys.publicKey);

    const invalid = await request(app)
      .post('/api/notifications/push-subscription')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ endpoint: 'http://127.0.0.1/private', keys: { p256dh: 'public', auth: 'secret' } });
    assert.equal(invalid.status, 400);

    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint';
    const created = await request(app)
      .post('/api/notifications/push-subscription')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ endpoint, keys: { p256dh: 'public-key', auth: 'auth-key' } });
    assert.equal(created.status, 201);
    assert.equal(await PushSubscription.countDocuments({ user: student._id, endpoint }), 1);
    const refreshedStudent = await User.findById(student._id);
    assert.equal(refreshedStudent.notificationPrefs.push, true);

    const originalSendNotification = webPush.sendNotification;
    const deliveries = [];
    webPush.sendNotification = async (subscription, payload) => {
      deliveries.push({ subscription, payload: JSON.parse(payload) });
    };
    try {
      await notify({ userId: student._id, title: 'New update', body: 'Check CampusHub', link: '/#dashboard', email: false });
    } finally {
      webPush.sendNotification = originalSendNotification;
    }
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].subscription.endpoint, endpoint);
    assert.equal(deliveries[0].payload.title, 'New update');

    webPush.sendNotification = async () => {
      throw Object.assign(new Error('Subscription expired'), { statusCode: 410 });
    };
    try {
      await sendPushNotifications(student._id, { title: 'Expired subscription' });
    } finally {
      webPush.sendNotification = originalSendNotification;
    }
    assert.equal(await PushSubscription.countDocuments({ user: student._id }), 0);

    const removed = await request(app)
      .delete('/api/notifications/push-subscription')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ endpoint });
    assert.equal(removed.status, 200);
    assert.equal(await PushSubscription.countDocuments({ user: student._id }), 0);
    assert.equal((await User.findById(student._id)).notificationPrefs.push, false);
  });
});
