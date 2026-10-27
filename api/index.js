const app = require('../src/app');
const mongoose = require('mongoose');
const { connectDb } = require('../src/config/db');
const logger = require('../src/utils/logger');

let connectionPromise;

async function ensureDbConnection() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required on Vercel');
  }
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = connectDb(process.env.MONGODB_URI).finally(() => {
      connectionPromise = null;
    });
  }
  await connectionPromise;
}

module.exports = async function handler(req, res) {
  try {
    await ensureDbConnection();
    return app(req, res);
  } catch (error) {
    logger.error('Vercel request could not connect to MongoDB', error);
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
};
