import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

export const fetchDashboardSummary = createAsyncThunk(
  'dashboard/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/dashboard/summary');
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load dashboard metrics');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    metrics: {
      total: 0,
      open: 0,
      inProgress: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
      reopened: 0,
      unassigned: 0,
      assignedToMe: 0,
    },
    byPriority: {},
    byCategory: [],
    recentActivity: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.metrics = action.payload.metrics;
        state.byPriority = action.payload.byPriority;
        state.byCategory = action.payload.byCategory;
        state.recentActivity = action.payload.recentActivity;
      })
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export default dashboardSlice.reducer;
