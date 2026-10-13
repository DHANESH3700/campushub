const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const membershipSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['requested', 'approved', 'rejected'], default: 'requested' },
    role: { type: String, default: 'member' }
  },
  { timestamps: true }
);

membershipSchema.index({ club: 1, user: 1 }, { unique: true });

const clubPostSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    title: String,
    body: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = {
  Club: mongoose.model('Club', clubSchema),
  ClubMembership: mongoose.model('ClubMembership', membershipSchema),
  ClubPost: mongoose.model('ClubPost', clubPostSchema)
};
