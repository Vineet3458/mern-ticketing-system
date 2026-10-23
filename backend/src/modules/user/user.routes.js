import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as userController from './user.controller.js';
import { ROLES } from '../../constants/index.js';
import {
  createAdminSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
} from '../../validators/user.validator.js';
import { otpLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, userController.updateProfile);
router.post(
  '/profile/email-change',
  authenticate,
  otpLimiter,
  validate(requestEmailChangeSchema),
  userController.requestEmailChange
);
router.post(
  '/profile/email-change/verify',
  authenticate,
  validate(verifyEmailChangeSchema),
  userController.verifyEmailChange
);
router.get('/', authenticate, authorize(ROLES.AGENT, ROLES.ADMIN), userController.listUsers);
router.patch('/:userId/role', authenticate, authorize(ROLES.ADMIN), userController.updateUserRole);

// Admin-only: Create a new admin or agent account directly (pre-verified, no OTP needed)
router.post('/create-admin', authenticate, authorize(ROLES.ADMIN), validate(createAdminSchema), userController.createAdmin);

export default router;
