import { projectAPI } from './api';

export const fetchAuditLogs = async ({ actorId, entityType, entityId, limit = 50 } = {}) => {
  try {
    const res = await projectAPI.getAudit({
      actorId,
      entityType,
      entityId,
      limit,
    });
    return { success: true, data: res.data || [] };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load audit logs';
    return { success: false, error: message };
  }
};

export const appendAudit = async (payload) => {
  try {
    const res = await projectAPI.appendAudit(payload);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to append audit log';
    return { success: false, error: message };
  }
};
