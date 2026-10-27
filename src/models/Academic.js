const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    startDate: Date,
    endDate: Date,
    isCurrent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    regulation: { type: String, required: true, uppercase: true, trim: true, default: 'CUSTOM' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, min: 1, max: 12 },
    credits: Number,
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

subjectSchema.index({ department: 1, regulation: 1, code: 1 }, { unique: true });

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: Number,
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' }
  },
  { timestamps: true }
);

const assessmentTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    maxMarks: { type: Number, required: true, min: 1 },
    weightage: Number
  },
  { timestamps: true }
);

module.exports = {
  AcademicYear: mongoose.model('AcademicYear', academicYearSchema),
  Subject: mongoose.model('Subject', subjectSchema),
  Section: mongoose.model('Section', sectionSchema),
  AssessmentType: mongoose.model('AssessmentType', assessmentTypeSchema)
};
