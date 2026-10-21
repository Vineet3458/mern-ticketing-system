import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendResponse } from '../../utils/ApiResponse.js';
import { ticketService } from './ticket.service.js';

export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.createTicket({
    user: req.user,
    ...req.body,
  });
  return sendResponse(res, 201, 'Ticket created successfully', ticket);
});

export const listTickets = asyncHandler(async (req, res) => {
  const result = await ticketService.listTickets({
    user: req.user,
    query: req.query,
  });
  return sendResponse(res, 200, 'Tickets retrieved successfully', result.tickets, result.meta);
});

export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicketByIdOrNumber({
    identifier: req.params.ticketId,
    user: req.user,
  });
  return sendResponse(res, 200, 'Ticket details retrieved', ticket);
});

export const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateTicketMetadata({
    ticketId: req.params.ticketId,
    user: req.user,
    updates: req.body,
  });
  return sendResponse(res, 200, 'Ticket metadata updated successfully', ticket);
});

export const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.assignTicket({
    ticketId: req.params.ticketId,
    user: req.user,
    agentId: req.body.agentId,
  });
  return sendResponse(res, 200, 'Ticket assigned successfully', ticket);
});

export const addMessage = asyncHandler(async (req, res) => {
  const message = await ticketService.addMessage({
    ticketId: req.params.ticketId,
    user: req.user,
    body: req.body.body,
    type: req.body.type,
    attachments: req.body.attachments,
  });
  return sendResponse(res, 201, 'Reply posted successfully', message);
});

export const resolveTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.resolveTicket({
    ticketId: req.params.ticketId,
    user: req.user,
    reason: req.body?.reason,
  });
  return sendResponse(res, 200, 'Ticket resolved successfully', ticket);
});

export const reopenTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.reopenTicket({
    ticketId: req.params.ticketId,
    user: req.user,
    reason: req.body?.reason,
  });
  return sendResponse(res, 200, 'Ticket reopened successfully', ticket);
});

export const closeTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.closeTicket({
    ticketId: req.params.ticketId,
    user: req.user,
    reason: req.body?.reason,
  });
  return sendResponse(res, 200, 'Ticket closed successfully', ticket);
});

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await ticketService.getMessages({
    ticketId: req.params.ticketId,
    user: req.user,
    page: req.query.page,
    limit: req.query.limit,
  });
  return sendResponse(res, 200, 'Conversation messages retrieved', messages);
});

export const getActivity = asyncHandler(async (req, res) => {
  const activity = await ticketService.getActivity({
    ticketId: req.params.ticketId,
    user: req.user,
  });
  return sendResponse(res, 200, 'Activity timeline retrieved', activity);
});
