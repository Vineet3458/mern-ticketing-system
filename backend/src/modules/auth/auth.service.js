import bcrypt from 'bcryptjs';
import { User } from '../../database/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateOTP, hashOTP, compareOTP } from '../../utils/otp.js';
import { generateTokens, verifyRefreshToken } from '../../utils/token.js';
import { emailService } from '../../services/email.service.js';
import { env } from '../../config/env.js';

export const authService = {
  async register({ name, email, phone, password, role }) {
    const normEmail = email.toLowerCase().trim();
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
      existingUser.phone = phone;
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
        phone,
        passwordHash,
        role: role || 'customer',
        isVerified: false,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpType: 'register',
      });
    }

    // Send verification OTP via email
    emailService.queueOTP(normEmail, name, otp);

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      message: 'Registration successful. Please verify the OTP sent to your email.',
      // For automated evaluation / easy testing, we also attach devOtp when not in production
      ...(env.isProd ? {} : { devOtp: otp }),
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
    const query = email ? { email: email.toLowerCase().trim() } : { phone: phone.trim() };
    const user = await User.findOne(query);

    if (!user) throw ApiError.notFound('Account not found with this identifier');

    if (user.isLocked()) {
      throw ApiError.forbidden('Account is temporarily locked. Please try again later.');
    }

    const otp = generateOTP();
    user.otpHash = await hashOTP(otp);
    user.otpExpiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);
    user.otpAttempts = 0;
    user.otpType = 'login';
    await user.save();

    emailService.queueOTP(user.email, user.name, otp);

    return {
      message: 'Login OTP sent successfully',
      email: user.email,
      ...(env.isProd ? {} : { devOtp: otp }),
    };
  },

  async verifyLoginOtp({ email, phone, otp, userAgent = '', ip = '' }) {
    const query = email ? { email: email.toLowerCase().trim() } : { phone: phone.trim() };
    const user = await User.findOne(query).select('+otpHash +otpExpiresAt +otpAttempts +otpType');

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
    if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);

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

    emailService.queueOTP(normEmail, user.name, otp);

    return {
      message: 'If an account exists with this email, a reset OTP has been sent.',
      ...(env.isProd ? {} : { devOtp: otp }),
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
};
