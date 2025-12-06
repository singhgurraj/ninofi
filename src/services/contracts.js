import api from './api';

export const contractAPI = {
  createContract: async (contractData) => api.post('/contracts', contractData),
  getProjectContracts: async (projectId) => api.get(`/contracts/project/${projectId}`),
  getUserContracts: async (userId) => api.get(`/contracts/user/${userId}`),
  getContractDetails: async (contractId) => api.get(`/contracts/${contractId}`),
  updateContractStatus: async (contractId, payload) => {
    const body =
      typeof payload === 'string' ? { status: payload } : { ...(payload || {}) };
    return api.put(`/contracts/${contractId}/status`, body);
  },
  signContract: async (contractId, signatureData) =>
    api.post(`/contracts/${contractId}/sign`, signatureData),
  getContractSignatures: async (contractId) => api.get(`/contracts/${contractId}/signatures`),
};
