import { setNotifications } from '../store/notificationSlice';
import api, { projectAPI } from './api';

export const loadNotifications = (userId) => async (dispatch) => {
  if (!userId) return;
  try {
    const response = await api.get(`/notifications/${userId}`);
    dispatch(setNotifications(response.data || []));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to load notifications' };
  }
};

export const decideApplication = (applicationId, action, ownerId) => {
  return projectAPI.decideApplication(applicationId, action, ownerId);
};

export const decideApplicationByProject = (payload) => {
  return projectAPI.decideApplicationByProject(payload);
};

export const markNotificationsRead = (userId, notificationIds) => {
  const payload =
    Array.isArray(notificationIds) && notificationIds.length
      ? { notificationIds }
      : { userId };
  return api.post('/notifications/mark-read', payload);
};
