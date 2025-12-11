import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import authReducer from './authSlice';
import invoiceReducer from './invoiceSlice';
import projectReducer from './projectSlice';
import notificationReducer from './notificationSlice';

const createNoopStorage = () => ({
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
});

const storage = typeof window === 'undefined' ? createNoopStorage() : AsyncStorage;

// Persist config for auth (so user stays logged in)
const authPersistConfig = {
  key: 'auth',
  storage,
  // Do not persist auth to avoid stale admin state across sessions.
  whitelist: [],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    invoices: invoiceReducer,
    projects: projectReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);
