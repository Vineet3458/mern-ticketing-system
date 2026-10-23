import Joi from 'joi';
import { ROLES } from '../constants/index.js';
import { checkEmailRestrictions } from '../utils/emailRestrictions.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phoneUtils.js';

const emailField = Joi.string()
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

const phoneField = Joi.string()
  .trim()
  .custom((value, helpers) => {
    if (!isValidPhoneNumber(value)) {
      return helpers.message(
        'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)'
      );
    }
    return normalizePhoneNumber(value);
  });

export const createAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: emailField.required(),
  phone: phoneField.required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid(ROLES.ADMIN, ROLES.AGENT).default(ROLES.ADMIN),
  isPhoneVerified: Joi.boolean().default(true),
});

export const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid(...Object.values(ROLES)).required(),
});

export const requestEmailChangeSchema = Joi.object({
  email: emailField.required(),
});

export const verifyEmailChangeSchema = Joi.object({
  currentEmailOtp: Joi.string().trim().length(6).required(),
  newEmailOtp: Joi.string().trim().length(6).required(),
});
