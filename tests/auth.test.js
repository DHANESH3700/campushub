const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown } = require('./helpers');

let app;

describe('auth', () => {
  before(async () => {
    app = await setup();
  });
  after(teardown);

  it('rejects login with bad credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'nope' });
    assert.equal(res.status, 401);
  });

  it('registers, logs in, and protects routes', async () => {
    const email = `sam${Date.now()}@campushub.edu`;
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Sam',
      email,
      password: 'Password1!',
      role: 'student'
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.user.password, undefined);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'Password1!' });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, email);

    const denied = await request(app).get('/api/auth/me');
    assert.equal(denied.status, 401);

    const bad = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');
    assert.equal(bad.status, 401);
  });

  it('does not allow public admin registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hacker',
      email: `hack${Date.now()}@campushub.edu`,
      password: 'Password1!',
      role: 'admin'
    });
    assert.equal(res.status, 403);
  });

  it('health check works without auth', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});
