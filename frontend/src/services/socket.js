import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(window.location.origin, {
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
