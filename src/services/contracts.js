import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
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

export const proposeContract = async ({ projectId, description, totalBudget, currency, userId }) => {
  if (!projectId || !description || !totalBudget || !currency) {
    return { success: false, error: 'projectId, description, totalBudget, and currency are required' };
  }
  try {
    const res = await projectAPI.proposeGeneratedContract(projectId, {
      description,
      totalBudget,
      currency,
      userId,
    });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to propose contract';
    return { success: false, error: msg };
  }
};

export const createContract = async ({ title, terms, projectId, createdBy }) => {
  if (!title || !terms || !projectId || !createdBy) {
    return { success: false, error: 'title, terms, projectId, and createdBy are required' };
  }
  try {
    const res = await projectAPI.createContract({ title, terms, projectId, createdBy });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to create contract';
    return { success: false, error: msg };
  }
};

export const fetchUserContracts = async (userId) => {
  if (!userId) return { success: false, error: 'userId is required' };
  try {
    const res = await projectAPI.getUserContracts(userId);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to load contracts';
    return { success: false, error: msg };
  }
};

export const fetchGeneratedContracts = async (projectId) => {
  if (!projectId) return { success: false, error: 'projectId is required' };
  try {
    const res = await projectAPI.listGeneratedContracts(projectId);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to load contracts';
    return { success: false, error: msg };
  }
};

export const fetchGeneratedContract = async (projectId, contractId) => {
  if (!projectId || !contractId) {
    return { success: false, error: 'projectId and contractId are required' };
  }
  try {
    const res = await projectAPI.getGeneratedContract(projectId, contractId);
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to load contract';
    return { success: false, error: msg };
  }
};

export const deleteGeneratedContract = async ({ projectId, contractId, userId }) => {
  if (!projectId || !contractId || !userId) {
    return { success: false, error: 'projectId, contractId, and userId are required' };
  }
  try {
    await projectAPI.deleteGeneratedContract(projectId, contractId, { userId });
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to delete contract';
    return { success: false, error: msg };
  }
};

export const signGeneratedContract = async ({ projectId, contractId, userId, signerRole }) => {
  if (!projectId || !contractId || !userId) {
    return { success: false, error: 'projectId, contractId, and userId are required' };
  }
  const signatureData = `Signed by ${userId} at ${new Date().toISOString()}`;
  try {
    const res = await projectAPI.signGeneratedContract(projectId, contractId, {
      userId,
      signatureData,
      signerRole,
    });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to sign contract';
    return { success: false, error: msg };
  }
};

export const downloadGeneratedContractPdf = async (projectId, contractId) => {
  if (!projectId || !contractId) {
    return { success: false, error: 'projectId and contractId are required' };
  }

  const saveBase64 = async (base64, filename = 'contract.pdf') => {
    const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const uri = `${dir}${filename}`;
    console.log('[contracts] Saving file to', uri);
    await FileSystem.writeAsStringAsync(uri, base64, {
      // Use string literal encoding for Expo FileSystem on RN
      encoding: 'base64',
    });
    return uri;
  };

  try {
    // Prefer binary to avoid parse issues (then fall back to JSON)
    console.log('[contracts] Fetching binary PDF…', { projectId, contractId });
    const binRes = await projectAPI.getGeneratedContractPdf(projectId, contractId, {
      responseType: 'arraybuffer',
      params: { mode: 'binary', ts: Date.now() }, // cache bust
      headers: { Accept: 'application/pdf' },
    });
    console.log('[contracts] Binary response status', binRes?.status, 'headers', binRes?.headers);
    const buffer = Buffer.from(binRes?.data || '');
    if (buffer.length) {
      console.log('[contracts] Binary buffer length', buffer.length);
      const b64 = buffer.toString('base64');
      const uri = await saveBase64(b64, `${contractId}.pdf`);
      if (await Sharing.isAvailableAsync()) {
        console.log('[contracts] Opening share sheet for', uri);
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save Contract' });
      }
      return { success: true, uri };
    }
    // Fallback to JSON if binary is empty
    console.log('[contracts] Binary empty, fetching JSON…');
    const res = await projectAPI.getGeneratedContractPdf(projectId, contractId, {
      responseType: 'json',
      params: { mode: 'json' },
    });
    console.log('[contracts] JSON response status', res?.status, 'headers', res?.headers);
    const data = res?.data;
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    console.log('[contracts] JSON body', parsed);
    const { base64, filename, message } = parsed || {};
    if (base64) {
      const uri = await saveBase64(base64, filename || 'contract.pdf');
      if (await Sharing.isAvailableAsync()) {
        console.log('[contracts] Opening share sheet for', uri);
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save Contract' });
      }
      return { success: true, uri };
    }
    throw new Error(message || 'No PDF returned');
  } catch (error) {
    console.log('[contracts] download error', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      stack: error?.stack,
    });
    try {
      const data = error?.response?.data;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('[contracts] fallback parsed error body', parsed);
      if (parsed?.base64) {
        const uri = await saveBase64(parsed.base64, parsed.filename || 'contract.pdf');
        if (await Sharing.isAvailableAsync()) {
          console.log('[contracts] Opening share sheet for', uri);
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save Contract' });
        }
        return { success: true, uri };
      }
    } catch (fallbackErr) {
      // ignore and surface original error
    }
    const status = error?.response?.status;
    const msg =
      error?.response?.data?.message ||
      (status ? `Download failed (status ${status})` : 'Failed to download contract');
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

export const updateGeneratedContract = async ({ projectId, contractId, userId, payload }) => {
  if (!projectId || !contractId || !userId) {
    return { success: false, error: 'projectId, contractId, and userId are required' };
  }
  try {
    const res = await projectAPI.updateGeneratedContract(projectId, contractId, { userId, ...payload });
    return { success: true, data: res.data };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to update contract';
    return { success: false, error: msg };
  }
};

export const fetchApprovedContractsForContractor = async (contractorId) => {
  if (!contractorId) return { success: false, error: 'contractorId is required' };
  try {
    const res = await projectAPI.listApprovedContractsForContractor(contractorId);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to load approved contracts';
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

export const deleteContract = async ({ contractId, userId }) => {
  if (!contractId || !userId) {
    return { success: false, error: 'contractId and userId are required' };
  }
  try {
    await projectAPI.deleteContract(contractId, { userId });
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to delete contract';
    return { success: false, error: msg };
  }
};

export const contractAPI = {
  getUserContracts: fetchUserContracts,
  createContract,
  deleteContract,
  fetchApprovedContractsForContractor,
};

export const fetchApprovedContractsForUser = async (userId) => {
  if (!userId) return { success: false, error: 'userId is required' };
  try {
    const res = await projectAPI.listApprovedContractsForUser(userId);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to load contracts';
    return { success: false, error: msg };
  }
};
