import { addNotification } from '../store/notificationSlice';
import api from './api';

export const loadNotifications = (userId) => async (dispatch) => {
  if (!userId) return;
  try {
    const response = await api.get(`/notifications/${userId}`);
    (response.data || []).forEach((n) => dispatch(addNotification(n)));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to load notifications' };
  }
};
