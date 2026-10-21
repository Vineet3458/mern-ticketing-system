import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import ticketReducer from '../features/tickets/ticketSlice.js';
import dashboardReducer from '../features/dashboard/dashboardSlice.js';
import categoryReducer from '../features/categories/categorySlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tickets: ticketReducer,
    dashboard: dashboardReducer,
    categories: categoryReducer,
  },
});
