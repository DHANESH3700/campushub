const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, STAFF_AREAS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    staffArea: { type: String, enum: STAFF_AREAS },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    studentId: { type: String, unique: true, sparse: true },
    employeeId: { type: String, unique: true, sparse: true },
    phone: String,
    photoFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' },
    semester: Number,
    section: String,
    graduationYear: Number,
    cgpa: Number,
    dateOfBirth: Date,
    address: String,
    bloodGroup: String,
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    notificationPrefs: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false }
    },
    pushSubscription: Object,
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.pre('save', async function hash(next) {
  if (!this.isModified('password')) return next();
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

userSchema.methods.comparePassword = function compare(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerifyToken;
  delete obj.pushSubscription;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
