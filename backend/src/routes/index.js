import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import ticketRoutes from '../modules/ticket/ticket.routes.js';
import categoryRoutes from '../modules/category/category.routes.js';
import emailRoutes from '../modules/email/email.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tickets', ticketRoutes);
router.use('/categories', categoryRoutes);
router.use('/email', emailRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;

