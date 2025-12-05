import { projectAPI } from './api';

export const searchContractors = async (filters = {}) => {
  try {
    const res = await projectAPI.searchContractors(filters);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to search contractors';
    return { success: false, error: message };
  }
};

export const fetchContractorProfile = async (contractorId) => {
  if (!contractorId) return { success: false, error: 'contractorId is required' };
  try {
    const res = await projectAPI.getContractorProfile(contractorId);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load contractor profile';
    return { success: false, error: message };
  }
};
