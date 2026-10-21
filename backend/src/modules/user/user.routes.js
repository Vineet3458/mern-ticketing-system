import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import * as userController from './user.controller.js';
import { ROLES } from '../../constants/index.js';

const router = Router();

router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, userController.updateProfile);
router.get('/', authenticate, authorize(ROLES.AGENT, ROLES.ADMIN), userController.listUsers);
router.patch('/:userId/role', authenticate, authorize(ROLES.ADMIN), userController.updateUserRole);

export default router;
