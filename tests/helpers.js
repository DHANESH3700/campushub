const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-please-change';
process.env.NODE_ENV = 'test';
process.env.EMAIL_FROM = 'CampusHub <test@campushub.local>';

let mongod;
let app;

async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../src/app');
  return app;
}

async function teardown() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function register(overrides = {}) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email: `u${Date.now()}@campushub.edu`,
    password: 'Password1!',
    role: 'student',
    ...overrides
  });
  return res;
}

async function login(email, password = 'Password1!') {
  return request(app).post('/api/auth/login').send({ email, password });
}

module.exports = { setup, teardown, register, login, getApp: () => app };
