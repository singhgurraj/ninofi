import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import invoiceReducer from './invoiceSlice';
import projectReducer from './projectSlice';
import notificationReducer from './notificationSlice';

// No persistence: every app launch starts with a clean auth state.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    invoices: invoiceReducer,
    projects: projectReducer,
    notifications: notificationReducer,
  },
});
