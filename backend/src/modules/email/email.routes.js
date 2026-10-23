import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { inboundEmailLimiter } from '../../middleware/rateLimiter.js';
import * as emailController from './email.controller.js';

const router = Router();

const authenticateAppsScript = (req, res, next) => {
  const configuredSecret = Buffer.from(env.email.appsScriptSecret || '');
  const suppliedSecret = req.body?.secret;
  const candidate = typeof suppliedSecret === 'string' ? Buffer.from(suppliedSecret) : null;
  if (
    !candidate ||
    !configuredSecret.length ||
    candidate.length !== configuredSecret.length ||
    !timingSafeEqual(candidate, configuredSecret)
  ) {
    return res.status(401).json({
      success: false,
      message: 'Invalid Apps Script credentials',
      data: null,
    });
  }

  return next();
};

router.post('/inbound', inboundEmailLimiter, emailController.handleInboundWebhook);
router.post(
  '/inbound/apps-script',
  inboundEmailLimiter,
  authenticateAppsScript,
  emailController.handleInboundWebhook
);

export default router;
