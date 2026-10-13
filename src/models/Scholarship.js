const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    benefits: String,
    eligibility: String,
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    minCgpa: Number,
    deadline: Date,
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const scholarshipAppSchema = new mongoose.Schema(
  {
    scholarship: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    statement: String,
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' }],
    status: { type: String, enum: ['submitted', 'under_review', 'awarded', 'rejected'], default: 'submitted' },
    reviewComment: String
  },
  { timestamps: true }
);

scholarshipAppSchema.index({ scholarship: 1, student: 1 }, { unique: true });

module.exports = {
  Scholarship: mongoose.model('Scholarship', scholarshipSchema),
  ScholarshipApplication: mongoose.model('ScholarshipApplication', scholarshipAppSchema)
};
