import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { User } from '../../database/index.js';
import { ROLES } from '../../constants/index.js';
import bcrypt from 'bcryptjs';
import { assertEmailNotRestricted } from '../../utils/emailRestrictions.js';
import { normalizePhoneNumber } from '../../utils/phoneUtils.js';
import { compareOTP, generateOTP, hashOTP } from '../../utils/otp.js';
import { env } from '../../config/env.js';
import { emailService } from '../../services/email.service.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  return sendResponse(res, 200, 'User profile retrieved', {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    isPhoneVerified: user.isPhoneVerified,
    phoneVerifiedAt: user.phoneVerifiedAt,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name) user.name = name.trim();
  if (phone) {
    const normPhone = normalizePhoneNumber(phone);
    if (user.phone !== normPhone) {
      user.phone = normPhone;
      user.isPhoneVerified = false;
      user.phoneVerifiedAt = null;
    }
  }
  await user.save();

  return sendResponse(res, 200, 'Profile updated successfully', {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
});

export const requestEmailChange = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  const pendingEmail = req.body.email.toLowerCase().trim();
  if (pendingEmail === user.email.toLowerCase()) {
    throw ApiError.badRequest('The new email address must be different from your current email');
  }
  if (await User.exists({ email: pendingEmail })) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  const currentEmailOtp = generateOTP();
  const newEmailOtp = generateOTP();
  user.pendingEmail = pendingEmail;
  user.emailChangeCurrentOtpHash = await hashOTP(currentEmailOtp);
  user.emailChangeNewOtpHash = await hashOTP(newEmailOtp);
  user.emailChangeOtpExpiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);
  user.emailChangeOtpAttempts = 0;
  await user.save();

  emailService.queueOTP(user.email, user.name, currentEmailOtp);
  emailService.queueOTP(pendingEmail, user.name, newEmailOtp);

  return sendResponse(res, 200, 'Verification codes sent to your current and new email addresses', {
    currentEmail: user.email,
    pendingEmail,
    expiresInMinutes: env.otp.expiresMinutes,
  });
});

export const verifyEmailChange = asyncHandler(async (req, res) => {
  const pendingChange = await User.findById(req.user.id).select(
    '+pendingEmail +emailChangeCurrentOtpHash +emailChangeNewOtpHash +emailChangeOtpExpiresAt +emailChangeOtpAttempts'
  );
  if (!pendingChange) throw ApiError.notFound('User not found');
  if (
    !pendingChange.pendingEmail ||
    !pendingChange.emailChangeCurrentOtpHash ||
    !pendingChange.emailChangeNewOtpHash ||
    !pendingChange.emailChangeOtpExpiresAt
  ) {
    throw ApiError.badRequest('No pending email change verification. Request new verification codes.');
  }
  if (pendingChange.emailChangeOtpAttempts >= env.otp.maxAttempts) {
    throw ApiError.badRequest('Maximum verification attempts reached. Request new verification codes.');
  }
  if (Date.now() > pendingChange.emailChangeOtpExpiresAt.getTime()) {
    throw ApiError.badRequest('Verification codes have expired. Request new verification codes.');
  }

  const user = await User.findOneAndUpdate(
    {
      _id: pendingChange._id,
      pendingEmail: pendingChange.pendingEmail,
      emailChangeOtpAttempts: { $lt: env.otp.maxAttempts },
      emailChangeOtpExpiresAt: { $gt: new Date() },
    },
    { $inc: { emailChangeOtpAttempts: 1 } },
    { new: true }
  ).select(
    '+pendingEmail +emailChangeCurrentOtpHash +emailChangeNewOtpHash +emailChangeOtpExpiresAt +emailChangeOtpAttempts'
  );
  if (!user) {
    throw ApiError.badRequest('Email change verification is no longer active. Request new verification codes.');
  }

  const [currentEmailMatches, newEmailMatches] = await Promise.all([
    compareOTP(req.body.currentEmailOtp, user.emailChangeCurrentOtpHash),
    compareOTP(req.body.newEmailOtp, user.emailChangeNewOtpHash),
  ]);
  if (!currentEmailMatches || !newEmailMatches) {
    throw ApiError.badRequest('One or both verification codes are incorrect');
  }

  if (await User.exists({ email: user.pendingEmail, _id: { $ne: user._id } })) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  let updatedUser;
  try {
    updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        pendingEmail: user.pendingEmail,
        emailChangeCurrentOtpHash: user.emailChangeCurrentOtpHash,
        emailChangeNewOtpHash: user.emailChangeNewOtpHash,
      },
      {
        $set: {
          email: user.pendingEmail,
          isVerified: true,
          pendingEmail: null,
          emailChangeCurrentOtpHash: null,
          emailChangeNewOtpHash: null,
          emailChangeOtpExpiresAt: null,
          emailChangeOtpAttempts: 0,
        },
      },
      { new: true, runValidators: true }
    ).select('name email role isVerified');
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('An account with this email address already exists');
    }
    throw error;
  }
  if (!updatedUser) {
    throw ApiError.badRequest('Email change verification is no longer active. Request new verification codes.');
  }

  return sendResponse(res, 200, 'Email address updated successfully', {
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    isVerified: updatedUser.isVerified,
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (role) {
    filter.role = role;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email phone role isVerified isPhoneVerified phoneVerifiedAt createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  return sendResponse(res, 200, 'Users retrieved', users, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    throw ApiError.badRequest(`Invalid role. Valid roles are: ${Object.values(ROLES).join(', ')}`);
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  user.role = role;
  await user.save();

  return sendResponse(res, 200, `User role updated to ${role}`, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

/**
 * Admin-only: Create a new admin or agent account directly.
 * The created account is pre-verified (no OTP flow needed).
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = ROLES.ADMIN } = req.body;
  const normEmail = email.toLowerCase().trim();

  // Validate email restrictions (no disposable/temp domains)
  assertEmailNotRestricted(normEmail);

  // Only allow creating admin or agent roles via this endpoint
  const allowedRoles = [ROLES.ADMIN, ROLES.AGENT];
  if (!allowedRoles.includes(role)) {
    throw ApiError.badRequest(`This endpoint only supports creating accounts with role: ${allowedRoles.join(', ')}`);
  }

  const existingUser = await User.findOne({ email: normEmail });
  if (existingUser) {
    throw ApiError.conflict(`An account with email "${normEmail}" already exists.`);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    name: name.trim(),
    email: normEmail,
    phone: normalizePhoneNumber(phone),
    passwordHash,
    role,
    isVerified: true,       // Admin-created accounts are pre-verified
    isPhoneVerified: false,
    lastLoginAt: null,
  });

  return sendResponse(
    res,
    201,
    `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
    {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt,
    }
  );
});
