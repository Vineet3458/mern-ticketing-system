import mongoose from 'mongoose';
import { ROLES } from '../../constants/index.js';

const sessionSchema = new mongoose.Schema({
  refreshTokenHash: { type: String, required: true },
  device: String,
  ip: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // OTP
  otpHash: { type: String, select: false },
  otpExpiresAt: Date,
  otpAttempts: { type: Number, default: 0 },
  otpPurpose: { type: String, enum: ['verify', 'login', 'reset'] },

  // Login protection
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,

  // Sessions / refresh tokens (multi-device)
  sessions: { type: [sessionSchema], select: false },
  loginHistory: [{ ip: String, device: String, at: { type: Date, default: Date.now }, success: Boolean }],
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
