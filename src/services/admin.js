import { projectAPI } from './api';

const adminKey = process.env.EXPO_PUBLIC_ADMIN_KEY;
const authHeaders = adminKey ? { 'x-admin-key': adminKey } : {};

export const fetchAdminAnalytics = async () => {
  try {
    const res = await projectAPI.getAdminAnalytics(authHeaders);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load analytics';
    return { success: false, error: message };
  }
};

export const fetchAdminUsers = async () => {
  try {
    const res = await projectAPI.getAdminUsers(authHeaders);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load users';
    return { success: false, error: message };
  }
};

export const fetchAdminDisputes = async () => {
  try {
    const res = await projectAPI.getAdminDisputes(authHeaders);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load disputes';
    return { success: false, error: message };
  }
};

export const resolveDispute = async (id, status, resolutionNotes) => {
  try {
    const res = await projectAPI.resolveDispute(
      id,
      { status, resolutionNotes },
      authHeaders
    );
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to resolve dispute';
    return { success: false, error: message };
  }
};

export const fetchAdminPendingTasks = async () => {
  try {
    const res = await projectAPI.getAdminPendingTasks();
    return { success: true, data: res.data?.tasks || [] };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load tasks';
    return { success: false, error: message };
  }
};

export const decideAdminTask = async (taskId, decision, message) => {
  try {
    const res = await projectAPI.postAdminTaskDecision(taskId, { decision, message });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to update task';
    return { success: false, error: msg };
  }
};
