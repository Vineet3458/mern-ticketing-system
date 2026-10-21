import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

export const fetchTickets = createAsyncThunk(
  'tickets/fetchTickets',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get('/tickets', { params });
      return {
        tickets: res.data.data,
        meta: res.data.meta || { total: res.data.data.length, page: 1, limit: 10, totalPages: 1 },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch tickets');
    }
  }
);

export const fetchTicketById = createAsyncThunk(
  'tickets/fetchTicketById',
  async (ticketId, { rejectWithValue }) => {
    try {
      const [ticketRes, messagesRes, activityRes] = await Promise.all([
        api.get(`/tickets/${ticketId}`),
        api.get(`/tickets/${ticketId}/messages`),
        api.get(`/tickets/${ticketId}/activity`),
      ]);
      return {
        ticket: ticketRes.data.data,
        messages: messagesRes.data.data,
        activity: activityRes.data.data,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load ticket details');
    }
  }
);

export const createTicket = createAsyncThunk(
  'tickets/createTicket',
  async (ticketData, { rejectWithValue }) => {
    try {
      const res = await api.post('/tickets', ticketData);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create ticket');
    }
  }
);

export const addMessage = createAsyncThunk(
  'tickets/addMessage',
  async ({ ticketId, body, type = 'public', attachments = [] }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tickets/${ticketId}/messages`, { body, type, attachments });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send message');
    }
  }
);

export const assignTicket = createAsyncThunk(
  'tickets/assignTicket',
  async ({ ticketId, agentId }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tickets/${ticketId}/assign`, { agentId });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to assign ticket');
    }
  }
);

export const resolveTicket = createAsyncThunk(
  'tickets/resolveTicket',
  async ({ ticketId, reason }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tickets/${ticketId}/resolve`, { reason });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to resolve ticket');
    }
  }
);

export const reopenTicket = createAsyncThunk(
  'tickets/reopenTicket',
  async ({ ticketId, reason }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tickets/${ticketId}/reopen`, { reason });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to reopen ticket');
    }
  }
);

export const closeTicket = createAsyncThunk(
  'tickets/closeTicket',
  async ({ ticketId, reason }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tickets/${ticketId}/close`, { reason });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to close ticket');
    }
  }
);

const ticketSlice = createSlice({
  name: 'tickets',
  initialState: {
    tickets: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    currentTicket: null,
    messages: [],
    activity: [],
    isLoading: false,
    isDetailLoading: false,
    isActionLoading: false,
    error: null,
  },
  reducers: {
    clearCurrentTicket: (state) => {
      state.currentTicket = null;
      state.messages = [];
      state.activity = [];
    },
    // Real-time Socket.IO dispatch handlers
    socketMessageReceived: (state, action) => {
      const { ticketId, message, status } = action.payload || {};
      if (state.currentTicket && (state.currentTicket._id === ticketId || state.currentTicket.ticketNumber === ticketId)) {
        if (message && message._id) {
          const exists = state.messages.some((m) => m._id === message._id);
          if (!exists) {
            state.messages.push(message);
          }
        }
        if (status) state.currentTicket.status = status;
      }
    },
    socketStatusUpdated: (state, action) => {
      const { ticketId, status } = action.payload;
      if (state.currentTicket && (state.currentTicket._id === ticketId || state.currentTicket.ticketNumber === ticketId)) {
        state.currentTicket.status = status;
      }
      // Also update in list if present
      const index = state.tickets.findIndex((t) => t._id === ticketId);
      if (index !== -1) {
        state.tickets[index].status = status;
      }
    },
    socketTicketAssigned: (state, action) => {
      const { ticketId, assignedTo } = action.payload;
      if (state.currentTicket && (state.currentTicket._id === ticketId || state.currentTicket.ticketNumber === ticketId)) {
        state.currentTicket.assignedTo = assignedTo;
      }
      const index = state.tickets.findIndex((t) => t._id === ticketId);
      if (index !== -1) {
        state.tickets[index].assignedTo = assignedTo;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tickets
      .addCase(fetchTickets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tickets = action.payload.tickets;
        state.meta = action.payload.meta;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch Ticket by ID
      .addCase(fetchTicketById.pending, (state) => {
        state.isDetailLoading = true;
        state.error = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action) => {
        state.isDetailLoading = false;
        state.currentTicket = action.payload.ticket;
        state.messages = action.payload.messages;
        state.activity = action.payload.activity;
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.isDetailLoading = false;
        state.error = action.payload;
      })

      // Create Ticket
      .addCase(createTicket.fulfilled, (state, action) => {
        state.tickets.unshift(action.payload);
      })

      // Add Message
      .addCase(addMessage.fulfilled, (state, action) => {
        const exists = state.messages.some((m) => m._id === action.payload._id);
        if (!exists) {
          state.messages.push(action.payload);
        }
      })

      // Assign Ticket
      .addCase(assignTicket.fulfilled, (state, action) => {
        if (state.currentTicket) {
          state.currentTicket.assignedTo = action.payload.assignedTo;
        }
      })

      // Resolve Ticket
      .addCase(resolveTicket.fulfilled, (state, action) => {
        if (state.currentTicket) {
          state.currentTicket.status = action.payload.status;
          state.currentTicket.resolvedAt = action.payload.resolvedAt;
        }
      })

      // Reopen Ticket
      .addCase(reopenTicket.fulfilled, (state, action) => {
        if (state.currentTicket) {
          state.currentTicket.status = action.payload.status;
          state.currentTicket.reopenedAt = action.payload.reopenedAt;
        }
      })

      // Close Ticket
      .addCase(closeTicket.fulfilled, (state, action) => {
        if (state.currentTicket) {
          state.currentTicket.status = action.payload.status;
          state.currentTicket.closedAt = action.payload.closedAt;
        }
      });
  },
});

export const {
  clearCurrentTicket,
  socketMessageReceived,
  socketStatusUpdated,
  socketTicketAssigned,
} = ticketSlice.actions;

export default ticketSlice.reducer;
