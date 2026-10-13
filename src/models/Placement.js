const mongoose = require('mongoose');
const { APPLICATION_STATUS } = require('../config/constants');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    website: String,
    description: String,
    industry: String,
    hrContact: String
  },
  { timestamps: true }
);

const opportunitySchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['job', 'internship'], required: true },
    description: String,
    skills: [String],
    minCgpa: Number,
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    graduationYears: [Number],
    deadline: Date,
    published: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const applicationSchema = new mongoose.Schema(
  {
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    coverNote: String,
    status: { type: String, enum: APPLICATION_STATUS, default: 'applied' },
    interviews: [
      {
        round: String,
        scheduledAt: Date,
        result: String,
        notes: String
      }
    ],
    history: [
      {
        status: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

applicationSchema.index({ opportunity: 1, student: 1 }, { unique: true });

module.exports = {
  Company: mongoose.model('Company', companySchema),
  Opportunity: mongoose.model('Opportunity', opportunitySchema),
  PlacementApplication: mongoose.model('PlacementApplication', applicationSchema)
};
