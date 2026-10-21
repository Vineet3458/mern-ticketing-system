import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ticketCreateLimiter } from '../../middleware/rateLimiter.js';
import * as ticketController from './ticket.controller.js';
import {
  createTicketSchema,
  updateTicketSchema,
  replyTicketSchema,
  assignTicketSchema,
  actionReasonSchema,
} from '../../validators/ticket.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', ticketController.listTickets);
router.post('/', ticketCreateLimiter, validate(createTicketSchema), ticketController.createTicket);
router.get('/:ticketId', ticketController.getTicket);
router.patch('/:ticketId', validate(updateTicketSchema), ticketController.updateTicket);
router.post('/:ticketId/messages', validate(replyTicketSchema), ticketController.addMessage);
router.post('/:ticketId/assign', validate(assignTicketSchema), ticketController.assignTicket);
router.post('/:ticketId/resolve', validate(actionReasonSchema), ticketController.resolveTicket);
router.post('/:ticketId/reopen', validate(actionReasonSchema), ticketController.reopenTicket);
router.post('/:ticketId/close', validate(actionReasonSchema), ticketController.closeTicket);
router.get('/:ticketId/messages', ticketController.getMessages);
router.get('/:ticketId/activity', ticketController.getActivity);

export default router;
