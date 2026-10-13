const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['notes', 'study_material', 'question_bank', 'previous_paper', 'other'], required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    semester: Number,
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    unit: String,
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archived: { type: Boolean, default: false },
    downloads: { type: Number, default: 0 }
  },
  { timestamps: true }
);

resourceSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);
