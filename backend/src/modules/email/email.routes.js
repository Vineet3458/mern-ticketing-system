import { Router } from 'express';
import { inboundEmailLimiter } from '../../middleware/rateLimiter.js';
import * as emailController from './email.controller.js';

const router = Router();

router.post('/inbound', inboundEmailLimiter, emailController.handleInboundWebhook);

export default router;
