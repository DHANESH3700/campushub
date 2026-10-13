const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  if (req.path.startsWith('/api')) {
    return next(new AppError('Route not found', 404));
  }
  next();
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  if (!err.isOperational) {
    logger.error(err);
  }
  res.status(status).json({
    success: false,
    message: status === 500 && isProd ? 'Internal server error' : err.message,
    details: err.details || undefined
  });
}

module.exports = { notFound, errorHandler };
