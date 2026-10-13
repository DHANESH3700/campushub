require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { connectDb } = require('./src/config/db');
const { startReminderJob } = require('./src/services/reminderService');
const logger = require('./src/utils/logger');

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  await connectDb();
  startReminderJob();
  const server = http.createServer(app);
  server.listen(PORT, () => {
    logger.info(`CampusHub listening on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});

module.exports = { start };
