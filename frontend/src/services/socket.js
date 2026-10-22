import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '') || window.location.origin;
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
