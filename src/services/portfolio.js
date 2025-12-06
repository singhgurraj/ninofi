import * as FileSystem from 'expo-file-system';
import { projectAPI } from './api';

export const fetchPortfolio = async (contractorId) => {
  if (!contractorId) return { success: false, error: 'contractorId is required' };
  try {
    const res = await projectAPI.getPortfolio(contractorId);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load portfolio';
    return { success: false, error: message };
  }
};

export const savePortfolio = async (payload) => {
  if (!payload?.contractorId) return { success: false, error: 'contractorId is required' };
  try {
    const media = await Promise.all(
      (payload.media || []).map(async (item) => {
        if (item.fileUri && !item.url) {
          const base64 = await FileSystem.readAsStringAsync(item.fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return { ...item, url: `data:${item.mimeType || 'image/jpeg'};base64,${base64}` };
        }
        return item;
      })
    );
    const res = await projectAPI.savePortfolio({ ...payload, media });
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to save portfolio';
    return { success: false, error: message };
  }
};

export const addPortfolioMedia = async (portfolioId, mediaItems = []) => {
  if (!portfolioId) return { success: false, error: 'portfolioId is required' };
  try {
    const media = await Promise.all(
      mediaItems.map(async (item) => {
        if (item.fileUri && !item.url) {
          const base64 = await FileSystem.readAsStringAsync(item.fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return { ...item, url: `data:${item.mimeType || 'image/jpeg'};base64,${base64}` };
        }
        return item;
      })
    );
    const res = await projectAPI.addPortfolioMedia(portfolioId, media);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to add media';
    return { success: false, error: message };
  }
};
