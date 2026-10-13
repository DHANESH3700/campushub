const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { connectDb, disconnectDb } = require('../src/config/db');

const originalUri = process.env.MONGODB_URI;
const originalNodeEnv = process.env.NODE_ENV;

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
});
