const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { sanitizeBody } = require('./middleware/validate');
const api = require('./routes');

const app = express();

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'"],
        'worker-src': ["'self'"]
      }
    }
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    credentials: true
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 400, standardHeaders: true, legacyHeaders: false })
);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/auth/forgot', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }));

app.use('/api', api);

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir, { maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0 }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
