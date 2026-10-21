import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendResponse } from '../../utils/ApiResponse.js';
import { authService } from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return sendResponse(res, 201, result.message, result);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.socket.remoteAddress || '';
  const result = await authService.verifyOtp({ ...req.body, userAgent, ip });

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendResponse(res, 200, 'Account successfully verified', result);
});

export const loginPassword = asyncHandler(async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.socket.remoteAddress || '';
  const result = await authService.loginPassword({ ...req.body, userAgent, ip });

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendResponse(res, 200, 'Login successful', result);
});

export const requestLoginOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestLoginOtp(req.body);
  return sendResponse(res, 200, result.message, result);
});

export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.socket.remoteAddress || '';
  const result = await authService.verifyLoginOtp({ ...req.body, userAgent, ip });

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendResponse(res, 200, 'OTP login successful', result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const tokenCandidate = req.body?.refreshToken || req.cookies?.refreshToken;
  const tokens = await authService.refreshToken(tokenCandidate);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendResponse(res, 200, 'Token refreshed successfully', tokens);
});

export const logout = asyncHandler(async (req, res) => {
  const tokenCandidate = req.body?.refreshToken || req.cookies?.refreshToken;
  await authService.logout(tokenCandidate);
  res.clearCookie('refreshToken');
  return sendResponse(res, 200, 'Logged out successfully');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  return sendResponse(res, 200, result.message, result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return sendResponse(res, 200, result.message);
});

export const sendPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const userId = req.user.id;
  const result = await authService.sendPhoneOtp({ phone, userId });
  return sendResponse(res, 200, result.message, result);
});

export const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const userId = req.user.id;
  const result = await authService.verifyPhoneOtp({ phone, otp, userId });
  return sendResponse(res, 200, result.message, result);
});
