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

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  return io;
};

export const ioService = {
  emitTicketMessage: (ticketId, data) => {
    if (!io) return;
    io.to(`ticket:${ticketId}`).emit('ticket_message', data);
    const sanitized = { ...data };
    if (sanitized.message?.type === 'internal') {
      sanitized.message = {
        _id: sanitized.message._id,
        type: 'internal',
        createdAt: sanitized.message.createdAt,
      };
    }
    io.emit('ticket_updated', { ticketId, ...sanitized });
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
