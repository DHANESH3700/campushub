const path = require('path');
const fs = require('fs');
const FileAsset = require('../models/FileAsset');
const AppError = require('../utils/AppError');
const { uploadRoot } = require('../middleware/upload');

async function saveUpload(req, file, visibility = 'private') {
  const asset = await FileAsset.create({
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    folder: req.uploadFolder || 'general',
    owner: req.user._id,
    visibility,
    allowedRoles: req.user.role === 'admin' ? undefined : [req.user.role],
    department: req.user.department
  });
  return asset;
}

function absolutePath(asset) {
  const folder = (asset.folder || 'general').replace(/\\/g, '/');
  const resolved = path.resolve(uploadRoot, folder, asset.storedName);
  if (!resolved.startsWith(path.resolve(uploadRoot))) {
    throw new AppError('Invalid file path', 400);
  }
  return resolved;
}

function canAccessFile(user, asset) {
  if (!user) return asset.visibility === 'public';
  if (user.role === 'admin') return true;
  if (String(asset.owner) === String(user._id)) return true;
  if (asset.visibility === 'public') return true;
  if (asset.visibility === 'department' && String(asset.department) === String(user.department)) return true;
  if (asset.visibility === 'role' && asset.allowedRoles?.includes(user.role)) return true;
  return false;
}

function streamFile(res, asset) {
  const filePath = absolutePath(asset);
  if (!fs.existsSync(filePath)) throw new AppError('File not found', 404);
  res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(asset.originalName || asset.storedName)}"`);
  fs.createReadStream(filePath).pipe(res);
}

module.exports = { saveUpload, absolutePath, canAccessFile, streamFile };
