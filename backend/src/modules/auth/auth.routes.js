import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/auth.js';
import * as authController from './auth.controller.js';
import {
  registerSchema,
  verifyOtpSchema,
  loginPasswordSchema,
  loginOtpSchema,
  verifyLoginOtpSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} from '../../validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login-password', authLimiter, validate(loginPasswordSchema), authController.loginPassword);
router.post('/login-otp', otpLimiter, validate(loginOtpSchema), authController.requestLoginOtp);
router.post('/verify-login-otp', otpLimiter, validate(verifyLoginOtpSchema), authController.verifyLoginOtp);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', otpLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Phone verification routes (require authenticated session)
router.post('/phone/send-otp', authenticate, otpLimiter, validate(sendPhoneOtpSchema), authController.sendPhoneOtp);
router.post('/phone/verify-otp', authenticate, otpLimiter, validate(verifyPhoneOtpSchema), authController.verifyPhoneOtp);

export default router;

