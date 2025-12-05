import * as FileSystem from 'expo-file-system';
import { projectAPI } from './api';

export const createContractDraft = async ({ projectId, createdBy, title, terms }) => {
  if (!projectId || !createdBy || !title || !terms) {
    return { success: false, error: 'projectId, createdBy, title, and terms are required' };
  }
  try {
    const res = await projectAPI.createContract({ projectId, createdBy, title, terms });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to create contract';
    return { success: false, error: msg };
  }
};

export const fetchContractsForProject = async (projectId) => {
  if (!projectId) return { success: false, error: 'projectId is required' };
  try {
    const res = await projectAPI.getContractsForProject(projectId);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to load contracts';
    return { success: false, error: msg };
  }
};

export const signContract = async ({ contractId, userId, signatureData }) => {
  if (!contractId || !userId || !signatureData) {
    return { success: false, error: 'contractId, userId, and signatureData are required' };
  }
  try {
    const res = await projectAPI.signContract(contractId, { userId, signatureData });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to sign contract';
    return { success: false, error: msg };
  }
};

export const uploadContractFile = async ({ projectId, userId, fileUri, fileName }) => {
  if (!projectId || !userId || !fileUri) {
    return { success: false, error: 'projectId, userId, and fileUri are required' };
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const res = await projectAPI.createContract({
      projectId,
      createdBy: userId,
      title: fileName || 'Contract',
      terms: `Attached file`,
      fileData: base64,
    });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to upload contract';
    return { success: false, error: msg };
  }
};
