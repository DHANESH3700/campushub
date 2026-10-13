const AppError = require('../utils/AppError');

function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => {
      const v = req.body[f];
      return v === undefined || v === null || v === '';
    });
    if (missing.length) {
      return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
    }
    next();
  };
}

function sanitizeString(value, max = 2000) {
  if (typeof value !== 'string') return value;
  return value.trim().slice(0, max);
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key], 8000);
      }
    }
  }
  next();
}

module.exports = { requireFields, sanitizeBody, sanitizeString };
