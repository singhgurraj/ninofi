import * as FileSystem from 'expo-file-system';
import { projectAPI } from './api';

export const fetchCompliance = async (userId) => {
  if (!userId) return { success: false, error: 'userId is required' };
  try {
    const res = await projectAPI.getCompliance(userId);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load compliance documents';
    return { success: false, error: message };
  }
};

export const uploadCompliance = async ({ userId, type, fileUri, fileName, mimeType, expiresAt, notes }) => {
  if (!userId || !type || !fileUri) {
    return { success: false, error: 'userId, type, and fileUri are required' };
    }
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const res = await projectAPI.uploadCompliance({
      userId,
      type,
      fileData: base64,
      fileName,
      mimeType,
      expiresAt,
      notes,
    });
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to upload document';
    return { success: false, error: message };
  }
};
