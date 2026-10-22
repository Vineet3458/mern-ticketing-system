import bcrypt from 'bcryptjs';
import { User } from '../../database/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateOTP, hashOTP, compareOTP } from '../../utils/otp.js';
import { generateTokens, verifyRefreshToken } from '../../utils/token.js';
import { emailService } from '../../services/email.service.js';
import { smsService } from '../../services/sms.service.js';
import { assertEmailNotRestricted } from '../../utils/emailRestrictions.js';
import { normalizePhoneNumber, buildPhoneQuery, formatDisplayPhone } from '../../utils/phoneUtils.js';
import { env } from '../../config/env.js';

export const authService = {
  async register({ name, email, phone, password, role }) {
    const normEmail = email.toLowerCase().trim();
    const normPhone = normalizePhoneNumber(phone);

    // Validate email against restrictions (disposable domains, blocklist, etc.)
    assertEmailNotRestricted(normEmail);

    let existingUser = await User.findOne({ email: normEmail });

    if (existingUser && existingUser.isVerified) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const otpExpiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

    let user;
    if (existingUser && !existingUser.isVerified) {
      existingUser.name = name;
      existingUser.phone = normPhone;
      existingUser.passwordHash = passwordHash;
      if (role) existingUser.role = role;
      existingUser.otpHash = otpHash;
      existingUser.otpExpiresAt = otpExpiresAt;
      existingUser.otpAttempts = 0;
      existingUser.otpType = 'register';
      user = await existingUser.save();
    } else {
      user = await User.create({
        name,
        email: normEmail,
        phone: normPhone,
        passwordHash,
        role: role || 'customer',
        isVerified: false,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpType: 'register',
      });
    }

    // Send real OTP SMS to mobile phone
    if (normPhone) {
      await smsService.sendPhoneOTP({
        phone: normPhone,
        otp,
        name,
        expiresMinutes: env.otp.expiresMinutes,
      });
    }

    // Send verification OTP via email
    emailService.queueOTP(normEmail, name, otp);

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      message: 'Registration successful. A verification OTP has been dispatched to your mobile phone and email.',
    };
  },

  async verifyOtp({ email, otp, type = 'register', userAgent = '', ip = '' }) {
    const normEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normEmail }).select(
      '+otpHash +otpExpiresAt +otpAttempts +otpType'
    );

    if (!user) throw ApiError.notFound('User account not found');

    if (!user.otpHash || !user.otpExpiresAt) {
      throw ApiError.badRequest('No pending OTP verification request found. Please request a new OTP.');
    }

    if (user.otpAttempts >= env.otp.maxAttempts) {
      throw ApiError.badRequest('Maximum OTP attempts reached. Please request a new code.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw ApiError.badRequest('OTP code has expired. Please request a new code.');
    }

    const isMatch = await compareOTP(otp, user.otpHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      throw ApiError.badRequest(`Invalid OTP code. Attempts remaining: ${env.otp.maxAttempts - user.otpAttempts}`);
    }

    // OTP Verified! Clear OTP fields
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpType = null;
    user.isVerified = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    const tokens = generateTokens(user);
    user.refreshTokens.push({
      token: tokens.refreshToken,
      userAgent,
      ip,
    });

    await user.save();

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  },

  async loginPassword({ email, password, userAgent = '', ip = '' }) {
    const normEmail = email.toLowerCase().trim();

    // Light email check on login to log suspicious patterns but not hard-block
    assertEmailNotRestricted(normEmail);

    const user = await User.findOne({ email: normEmail }).select('+passwordHash');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.isLocked()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      throw ApiError.forbidden(`Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }
      await user.save();
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isVerified) {
      // Re-send verification OTP
      const otp = generateOTP();
      user.otpHash = await hashOTP(otp);
      user.otpExpiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);
      user.otpAttempts = 0;
      user.otpType = 'register';
      await user.save();

      emailService.queueOTP(normEmail, user.name, otp);

      throw ApiError.forbidden('Account is not verified yet. A new OTP has been sent to your email.');
    }

    // Reset failed login counter
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    const tokens = generateTokens(user);
    user.refreshTokens.push({
      token: tokens.refreshToken,
      userAgent,
      ip,
    });

    // Keep only last 5 active refresh sessions
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  },

  async requestLoginOtp({ email, phone }) {
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (phone) {
      user = await User.findOne(buildPhoneQuery(phone));
    }

    if (!user) throw ApiError.notFound('Account not found with this mobile number or email');

    if (user.isLocked()) {
      throw ApiError.forbidden('Account is temporarily locked. Please try again later.');
    }

    const otp = generateOTP();
    user.otpHash = await hashOTP(otp);
    user.otpExpiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);
    user.otpAttempts = 0;
    user.otpType = 'login';
    await user.save();

    // Send real OTP SMS to user's registered phone
    if (user.phone) {
      await smsService.sendPhoneOTP({
        phone: user.phone,
        otp,
        name: user.name,
        expiresMinutes: env.otp.expiresMinutes,
      });
    }

    // Also queue backup email OTP if user has email
    if (user.email) {
      emailService.queueOTP(user.email, user.name, otp);
    }

    const recipientText = user.phone
      ? `mobile number ending in ...${user.phone.slice(-4)}`
      : user.email;

    return {
      message: `Login OTP sent successfully to ${recipientText}`,
      email: user.email,
      phone: user.phone,
    };
  },

  async verifyLoginOtp({ email, phone, otp, userAgent = '', ip = '' }) {
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).select('+otpHash +otpExpiresAt +otpAttempts +otpType');
    } else if (phone) {
      user = await User.findOne(buildPhoneQuery(phone)).select('+otpHash +otpExpiresAt +otpAttempts +otpType');
    }

    if (!user) throw ApiError.notFound('Account not found');

    if (!user.otpHash || !user.otpExpiresAt) {
      throw ApiError.badRequest('No pending login OTP found. Please request one first.');
    }

    if (user.otpAttempts >= env.otp.maxAttempts) {
      throw ApiError.badRequest('Maximum attempts reached. Please request a new OTP.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw ApiError.badRequest('OTP expired. Please request a new OTP.');
    }

    const isMatch = await compareOTP(otp, user.otpHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      throw ApiError.badRequest(`Invalid OTP. Attempts remaining: ${env.otp.maxAttempts - user.otpAttempts}`);
    }

    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpType = null;
    user.isVerified = true;
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();

    const tokens = generateTokens(user);
    user.refreshTokens.push({
      token: tokens.refreshToken,
      userAgent,
      ip,
    });

    // Keep only last 5 active refresh sessions
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  },

  async refreshToken(tokenCandidate) {
    if (!tokenCandidate) throw ApiError.unauthorized('Refresh token is required');

    let decoded;
    try {
      decoded = verifyRefreshToken(tokenCandidate);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized('User not found');

    const tokenIndex = user.refreshTokens.findIndex((t) => t.token === tokenCandidate);
    if (tokenIndex === -1) {
      throw ApiError.unauthorized('Refresh token revoked or invalid');
    }

    // Issue fresh tokens and rotate
    const tokens = generateTokens(user);
    user.refreshTokens[tokenIndex].token = tokens.refreshToken;
    user.refreshTokens[tokenIndex].createdAt = new Date();
    await user.save();

    return tokens;
  },

  async logout(tokenCandidate) {
    if (!tokenCandidate) return true;
    try {
      const decoded = verifyRefreshToken(tokenCandidate);
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t.token !== tokenCandidate);
        await user.save();
      }
    } catch {
      // Ignored on logout
    }
    return true;
  },

  async forgotPassword(email) {
    const normEmail = email.toLowerCase().trim();
    assertEmailNotRestricted(normEmail);

    const user = await User.findOne({ email: normEmail });
    if (!user) {
      // Return generic message to prevent email enumeration
      return { message: 'If an account exists with this email, a reset OTP has been sent.' };
    }

    const otp = generateOTP();
    user.otpHash = await hashOTP(otp);
    user.otpExpiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);
    user.otpAttempts = 0;
    user.otpType = 'reset';
    await user.save();

    // Send real OTP SMS if user has mobile phone
    if (user.phone) {
      await smsService.sendPhoneOTP({
        phone: user.phone,
        otp,
        name: user.name,
        expiresMinutes: env.otp.expiresMinutes,
      });
    }

    emailService.queueOTP(normEmail, user.name, otp);

    return {
      message: 'If an account exists with this email, a reset OTP has been sent to your registered mobile phone and email.',
    };
  },

  async resetPassword({ email, otp, newPassword }) {
    const normEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normEmail }).select(
      '+passwordHash +otpHash +otpExpiresAt +otpAttempts +otpType'
    );

    if (!user) throw ApiError.badRequest('Invalid reset request');

    if (!user.otpHash || !user.otpExpiresAt) {
      throw ApiError.badRequest('No pending reset OTP found. Please request a new one.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw ApiError.badRequest('Reset OTP has expired. Please request a new one.');
    }

    const isMatch = await compareOTP(otp, user.otpHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      throw ApiError.badRequest('Invalid reset OTP code.');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpType = null;
    user.refreshTokens = []; // Revoke all sessions on password reset
    await user.save();

    return { message: 'Password reset successful. Please login with your new password.' };
  },

  /**
   * Send a 6-digit OTP to the user's phone number for mobile verification.
   * Uses the crypto-backed generateOTP and smsService.
   */
  async sendPhoneOtp({ phone, userId }) {
    const normPhone = String(phone).trim();
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User account not found');

    if (user.phone !== normPhone) {
      throw ApiError.badRequest('Provided phone number does not match account phone on file.');
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    user.phoneOtpHash = otpHash;
    user.phoneOtpExpiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);
    user.phoneOtpAttempts = 0;
    await user.save();

    const smsResult = await smsService.sendPhoneOTP({
      phone: normPhone,
      otp,
      name: user.name,
      expiresMinutes: env.otp.expiresMinutes,
    });

    return {
      message: `OTP sent to ${normPhone}. Check your messages.`,
      phone: normPhone,
      ...((env.isDev || env.isTest) ? { smsMessageId: smsResult.messageId } : {}),
    };
  },

  /**
   * Verify mobile OTP to mark the phone number as verified.
   */
  async verifyPhoneOtp({ phone, otp, userId }) {
    const normPhone = String(phone).trim();
    const user = await User.findById(userId).select(
      '+phoneOtpHash +phoneOtpExpiresAt +phoneOtpAttempts'
    );
    if (!user) throw ApiError.notFound('User account not found');

    if (!user.phoneOtpHash || !user.phoneOtpExpiresAt) {
      throw ApiError.badRequest('No pending phone OTP request. Please request a new code first.');
    }

    if (user.phoneOtpAttempts >= env.otp.maxAttempts) {
      throw ApiError.badRequest('Maximum phone OTP attempts reached. Please request a new code.');
    }

    if (new Date() > user.phoneOtpExpiresAt) {
      throw ApiError.badRequest('Phone OTP has expired. Please request a new code.');
    }

    const isMatch = await compareOTP(otp, user.phoneOtpHash);
    if (!isMatch) {
      user.phoneOtpAttempts += 1;
      await user.save();
      throw ApiError.badRequest(
        `Invalid phone OTP. Attempts remaining: ${env.otp.maxAttempts - user.phoneOtpAttempts}`
      );
    }

    user.phoneOtpHash = null;
    user.phoneOtpExpiresAt = null;
    user.phoneOtpAttempts = 0;
    user.isPhoneVerified = true;
    user.phoneVerifiedAt = new Date();
    await user.save();

    return {
      message: 'Phone number verified successfully!',
      phone: normPhone,
      isPhoneVerified: true,
      phoneVerifiedAt: user.phoneVerifiedAt,
    };
  },
};
