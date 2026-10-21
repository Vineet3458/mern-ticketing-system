import Joi from 'joi';
import { ROLES } from '../constants/index.js';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
  phone: Joi.string().trim().min(7).max(20).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.CUSTOMER),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
  otp: Joi.string().trim().length(6).required(),
  type: Joi.string().valid('register', 'login', 'reset').default('register'),
});

export const loginPasswordSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

export const loginOtpSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }),
  phone: Joi.string().trim(),
}).xor('email', 'phone');

export const verifyLoginOtpSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }),
  phone: Joi.string().trim(),
  otp: Joi.string().trim().length(6).required(),
}).xor('email', 'phone');

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().allow('', null),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
  otp: Joi.string().trim().length(6).required(),
  newPassword: Joi.string().min(6).max(128).required(),
});
