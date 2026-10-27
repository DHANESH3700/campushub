const path = require('path');
const fs = require('fs');
const FileAsset = require('../models/FileAsset');
const AppError = require('../utils/AppError');
const { uploadRoot } = require('../middleware/upload');
const objectStorage = require('./s3Storage');
const logger = require('../utils/logger');

async function saveUpload(req, file, visibility = 'private') {
  const folder = req.uploadFolder || 'general';
  let storageProvider = 'local';
  let storageBucket;
  let storedName = file.filename;
  if (objectStorage.isEnabled()) {
    storedName = `${folder}/${file.filename}`;
    try {
      storageBucket = await objectStorage.uploadFile(file.path, storedName, file.mimetype);
    } catch (error) {
      try {
        await fs.promises.unlink(file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') logger.warn('Could not remove failed temporary upload', cleanupError.message);
      }
      throw error;
    }
    storageProvider = 's3';
  }

  let asset;
  try {
    asset = await FileAsset.create({
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      folder,
      storageProvider,
      storageBucket,
      owner: req.user._id,
      visibility,
      allowedRoles: req.user.role === 'admin' ? undefined : [req.user.role],
      department: req.uploadDepartment || req.user.department
    });
  } catch (error) {
    if (storageProvider === 's3') {
      try {
        await objectStorage.deleteFile(storageBucket, storedName);
      } catch (cleanupError) {
        logger.warn('Could not remove unreferenced S3 upload', cleanupError.message);
      }
      try {
        await fs.promises.unlink(file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') logger.warn('Could not remove failed temporary upload', cleanupError.message);
      }
    }
    throw error;
  }
  if (storageProvider === 's3') {
    try {
      await fs.promises.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') logger.warn('Could not remove temporary upload file', error.message);
    }
  }
  return asset;
}

function absolutePath(asset) {
  const folder = (asset.folder || 'general').replace(/\\/g, '/');
  const resolvedRoot = path.resolve(uploadRoot);
  const resolved = path.resolve(resolvedRoot, folder, asset.storedName);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
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

async function streamFile(res, asset) {
  if (asset.storageProvider === 's3') {
    let object;
    try {
      object = await objectStorage.getFile(asset.storageBucket, asset.storedName);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new AppError('File not found', 404);
      }
      throw error;
    }
    if (!object.Body) throw new AppError('File not found', 404);
    res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(asset.originalName || asset.storedName)}"`);
    if (object.ContentLength != null) res.setHeader('Content-Length', object.ContentLength);
    object.Body.on('error', (error) => {
      logger.error('S3 file stream failed', error);
      res.destroy(error);
    });
    object.Body.pipe(res);
    return;
  }
  const filePath = absolutePath(asset);
  if (!fs.existsSync(filePath)) throw new AppError('File not found', 404);
  res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(asset.originalName || asset.storedName)}"`);
  fs.createReadStream(filePath).pipe(res);
}

module.exports = { saveUpload, absolutePath, canAccessFile, streamFile };
