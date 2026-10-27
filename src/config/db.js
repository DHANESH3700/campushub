const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const logger = require('../utils/logger');

let memoryServer;

function requiresConfiguredDatabase() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

async function connectDb(uri = process.env.MONGODB_URI) {
  if (!uri) {
    if (requiresConfiguredDatabase()) {
      throw new Error('MONGODB_URI is required in production and on Vercel');
    }

    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    process.env.MONGODB_URI = uri;
    logger.warn('No MONGODB_URI configured; using an in-memory MongoDB instance for local development.');
  }

  mongoose.set('strictQuery', true);

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri);
    }
  } catch (error) {
    if (requiresConfiguredDatabase()) {
      throw error;
    }

    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      process.env.MONGODB_URI = uri;
      logger.warn('Configured MongoDB was unavailable; falling back to an in-memory MongoDB instance for local development.');
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri);
    }
  }

  logger.info(memoryServer ? 'Connected to in-memory MongoDB' : 'Connected to MongoDB');
}

async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDb, disconnectDb };
