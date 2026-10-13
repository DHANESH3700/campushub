const mongoose = require('mongoose');

const careerProfileSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    headline: String,
    skills: [String],
    education: [{ institution: String, degree: String, year: String, score: String }],
    projects: [{ title: String, description: String, link: String }],
    experience: [{ organization: String, role: String, from: String, to: String, details: String }],
    certifications: [{ name: String, issuer: String, year: String }],
    resumeVersions: [
      {
        file: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
        label: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    currentResume: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CareerProfile', careerProfileSchema);
