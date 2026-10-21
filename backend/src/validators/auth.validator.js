import Joi from 'joi';
import { ROLES } from '../constants/index.js';
import { checkEmailRestrictions } from '../utils/emailRestrictions.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phoneUtils.js';

export const emailRestrictionValidator = (value, helpers) => {
  const check = checkEmailRestrictions(value);
  if (!check.valid) {
    return helpers.error('any.custom', { message: check.reason });
  }
  return value.toLowerCase();
};

export const emailField = Joi.string()
  .trim()
  .max(100)
  .email({ tlds: { allow: false } })
  .custom((value, helpers) => {
    const check = checkEmailRestrictions(value);
    if (!check.valid) {
      return helpers.message(check.reason);
    }
    return value.toLowerCase();
  });

export const phoneField = Joi.string()
  .trim()
  .custom((value, helpers) => {
    if (!isValidPhoneNumber(value)) {
      return helpers.message(
        'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)'
      );
    }
    return normalizePhoneNumber(value);
  });

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: emailField.required(),
  phone: phoneField.required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.CUSTOMER),
});

export const verifyOtpSchema = Joi.object({
  email: emailField.required(),
  otp: Joi.string().trim().length(6).required(),
  type: Joi.string().valid('register', 'login', 'reset').default('register'),
});

export const loginPasswordSchema = Joi.object({
  email: emailField.required(),
  password: Joi.string().required(),
});

export const loginOtpSchema = Joi.object({
  email: emailField,
  phone: phoneField,
}).xor('email', 'phone');

export const verifyLoginOtpSchema = Joi.object({
  email: emailField,
  phone: phoneField,
  otp: Joi.string().trim().length(6).required(),
}).xor('email', 'phone');

export const sendPhoneOtpSchema = Joi.object({
  phone: phoneField.required(),
});

export const verifyPhoneOtpSchema = Joi.object({
  phone: phoneField.required(),
  otp: Joi.string().trim().length(6).required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().allow('', null),
});

export const forgotPasswordSchema = Joi.object({
  email: emailField.required(),
});

export const resetPasswordSchema = Joi.object({
  email: emailField.required(),
  otp: Joi.string().trim().length(6).required(),
  newPassword: Joi.string().min(6).max(128).required(),
});
