const mongoose = require('mongoose');

const fileAssetSchema = new mongoose.Schema(
  {
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    folder: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visibility: { type: String, enum: ['private', 'role', 'department', 'public'], default: 'private' },
    allowedRoles: [String],
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FileAsset', fileAssetSchema);
