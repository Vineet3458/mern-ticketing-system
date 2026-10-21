import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';

let io = null;

export const initSocket = (httpServer, clientUrl) => {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      logger.info(`[Socket.IO] Client ${socket.id} joined room ticket:${ticketId}`);
    });

    socket.on('leave_ticket', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      logger.info(`[Socket.IO] Client ${socket.id} left room ticket:${ticketId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const ioService = {
  emitTicketMessage: (ticketId, data) => {
    if (!io) return;
    io.to(`ticket:${ticketId}`).emit('ticket_message', data);
    io.emit('ticket_updated', { ticketId, ...data });
  },

  emitTicketStatusUpdated: (ticketId, data) => {
    if (!io) return;
    io.to(`ticket:${ticketId}`).emit('ticket_status', data);
    io.emit('ticket_updated', { ticketId, ...data });
  },

  emitTicketAssigned: (ticketId, data) => {
    if (!io) return;
    io.to(`ticket:${ticketId}`).emit('ticket_assigned', data);
    io.emit('ticket_updated', { ticketId, ...data });
  },
};
