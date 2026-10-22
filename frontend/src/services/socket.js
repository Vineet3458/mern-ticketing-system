import { io } from 'socket.io-client';
import { backendOrigin } from './backendUrl.js';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const backendUrl = backendOrigin || window.location.origin;
    socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
};

export const joinTicketRoom = (ticketId) => {
  const s = getSocket();
  if (s && ticketId) {
    s.emit('join_ticket', ticketId);
  }
};

export const leaveTicketRoom = (ticketId) => {
  const s = getSocket();
  if (s && ticketId) {
    s.emit('leave_ticket', ticketId);
  }
};
