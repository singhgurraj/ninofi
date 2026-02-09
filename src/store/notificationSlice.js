import { createSlice, nanoid } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
  },
  reducers: {
    setNotifications: (state, action) => {
      const list = Array.isArray(action.payload) ? action.payload : [];
      state.items = list.map((n) => ({
        id: n.id || nanoid(),
        createdAt: n.createdAt || new Date().toISOString(),
        read: !!n.read,
        ...n,
      }));
    },
    addNotification: {
      reducer: (state, action) => {
        const idx = state.items.findIndex((n) => n.id === action.payload.id);
        if (idx >= 0) {
          state.items[idx] = { ...state.items[idx], ...action.payload, read: false };
        } else {
          state.items.unshift({ ...action.payload, read: false });
        }
      },
      prepare: (data) => ({
        payload: {
          id: data?.id || nanoid(),
          createdAt: data?.createdAt || new Date().toISOString(),
          read: data?.read ?? false,
          ...data,
        },
      }),
    },
    markNotificationRead: (state, action) => {
      const notif = state.items.find((n) => n.id === action.payload);
      if (notif) notif.read = true;
    },
    markAllRead: (state) => {
      state.items = state.items.map((n) => ({ ...n, read: true }));
    },
    clearNotifications: (state) => {
      state.items = [];
    },
  },
});

export const { setNotifications, addNotification, markNotificationRead, markAllRead, clearNotifications } =
  notificationSlice.actions;

export default notificationSlice.reducer;
