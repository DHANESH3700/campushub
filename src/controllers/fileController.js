const FileAsset = require('../models/FileAsset');
const Resource = require('../models/Resource');
const DocumentRequest = require('../models/DocumentRequest');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { canAccessFile, streamFile } = require('../services/fileService');

const download = asyncHandler(async (req, res) => {
  const asset = await FileAsset.findById(req.params.id);
  if (!asset) throw new AppError('File not found', 404);
  if (!canAccessFile(req.user, asset)) {
    const isRequester = await DocumentRequest.exists({
      completedDocument: asset._id,
      requester: req.user._id
    });
    if (!isRequester) throw new AppError('Not authorized to access this file', 403);
  }
  if (req.query.as === 'resource') {
    await Resource.updateOne({ file: asset._id }, { $inc: { downloads: 1 } });
  }
  await streamFile(res, asset);
});

module.exports = { download };
