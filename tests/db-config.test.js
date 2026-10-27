const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { connectDb, disconnectDb } = require('../src/config/db');

const originalUri = process.env.MONGODB_URI;
const originalNodeEnv = process.env.NODE_ENV;
const originalVercel = process.env.VERCEL;

async function clearConnection() {
  try {
    await disconnectDb();
  } catch {
    // ignore
  }
}

describe('database config', () => {
  afterEach(async () => {
    await clearConnection();
    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it('falls back to an in-memory MongoDB in development when no MONGODB_URI is set', async () => {
    delete process.env.MONGODB_URI;
    process.env.NODE_ENV = 'development';

    await assert.doesNotReject(async () => {
      await connectDb();
    });

    const ok = !!(await require('mongoose').connection.readyState);
    assert.equal(ok, true);
  });

  it('requires a configured MongoDB on Vercel instead of starting an in-memory database', async () => {
    delete process.env.MONGODB_URI;
    process.env.NODE_ENV = 'development';
    process.env.VERCEL = '1';

    await assert.rejects(connectDb(), /MONGODB_URI is required in production and on Vercel/);
  });
});
