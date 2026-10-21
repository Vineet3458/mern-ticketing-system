import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';

const router = Router();

router.use('/health', healthRoutes);
// Next steps will mount:
// router.use('/auth', authRoutes);
// router.use('/tickets', ticketRoutes);
// router.use('/categories', categoryRoutes);
// router.use('/email', emailRoutes);
// router.use('/dashboard', dashboardRoutes);

export default router;
