const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { ALLOWED_MIME } = require('../config/constants');

const uploadRoot = path.resolve(
  process.env.UPLOAD_DIR ||
    (process.env.VERCEL ? path.join(os.tmpdir(), 'campushub-uploads') : 'uploads')
);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = path.join(uploadRoot, (req.uploadFolder || 'general').replace(/[^a-z0-9/_-]/gi, ''));
    const resolved = path.resolve(folder);
    if (!resolved.startsWith(uploadRoot)) return cb(new AppError('Invalid upload path', 400));
    ensureDir(resolved);
    cb(null, resolved);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new AppError('File type not allowed', 400));
  }
  cb(null, true);
}

const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 10);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024, files: 5 }
});

function setFolder(folder) {
  return (req, res, next) => {
    req.uploadFolder = folder;
    next();
  };
}

module.exports = { upload, setFolder, uploadRoot, ensureDir };
