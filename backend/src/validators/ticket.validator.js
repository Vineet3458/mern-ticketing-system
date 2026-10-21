import Joi from 'joi';
import { TICKET_PRIORITY, TICKET_STATUS, MESSAGE_TYPE } from '../constants/index.js';

export const createTicketSchema = Joi.object({
  subject: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().trim().min(5).required(),
  category: Joi.string().trim().required(),
  priority: Joi.string().valid(...Object.values(TICKET_PRIORITY)).default(TICKET_PRIORITY.MEDIUM),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      size: Joi.number().optional(),
      mimeType: Joi.string().optional(),
    })
  ).default([]),
});

export const updateTicketSchema = Joi.object({
  category: Joi.string().trim().optional(),
  priority: Joi.string().valid(...Object.values(TICKET_PRIORITY)).optional(),
  status: Joi.string().valid(...Object.values(TICKET_STATUS)).optional(),
});

export const replyTicketSchema = Joi.object({
  body: Joi.string().trim().min(1).required(),
  type: Joi.string().valid(...Object.values(MESSAGE_TYPE)).default(MESSAGE_TYPE.PUBLIC),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      size: Joi.number().optional(),
      mimeType: Joi.string().optional(),
    })
  ).default([]),
});

export const assignTicketSchema = Joi.object({
  agentId: Joi.string().hex().length(24).required(),
});

export const actionReasonSchema = Joi.object({
  reason: Joi.string().trim().allow('', null).optional(),
});
