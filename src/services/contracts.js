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
