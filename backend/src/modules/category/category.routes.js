import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import * as categoryController from './category.controller.js';
import { ROLES } from '../../constants/index.js';

const router = Router();

router.get('/', categoryController.listCategories);
router.post('/', authenticate, authorize(ROLES.ADMIN), categoryController.createCategory);
router.patch('/:categoryId', authenticate, authorize(ROLES.ADMIN), categoryController.updateCategory);

export default router;
