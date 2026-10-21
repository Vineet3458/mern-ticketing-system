import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

router.get('/summary', authenticate, dashboardController.getDashboardSummary);

export default router;
