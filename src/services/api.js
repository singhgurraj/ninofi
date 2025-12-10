import Constants from 'expo-constants';
import axios from 'axios';

let authToken = null;

const resolveBaseUrl = () => {
  // Preferred: explicit env var for Railway/production
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Optional: expo config extra
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // Default to deployed API to avoid hitting LAN/localhost on device
  return 'https://ninofi-production.up.railway.app/api';
};

const API_BASE_URL = resolveBaseUrl();
console.log('[api] base URL', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    return api.post('/auth/login', { email, password });
  },

  register: async (userData) => {
    return api.post('/auth/register', userData);
  },

  logout: async () => {
    return Promise.resolve();
  },
};

export const setAuthToken = (token) => {
  authToken = token || null;
};

// Project API calls
export const projectAPI = {
  getProjectsForUser: async (userId) => api.get(`/projects/user/${userId}`),
  getProjectsForContractor: async (contractorId) =>
    api.get(`/projects/contractor/${contractorId}`),
  getOpenProjects: async (contractorId) =>
    api.get('/projects/open', { params: contractorId ? { contractorId } : {} }),
  createProject: async (projectData) => api.post('/projects', projectData),
  updateProject: async (id, projectData) => api.put(`/projects/${id}`, projectData),
  deleteProject: async (id) => api.delete(`/projects/${id}`),
  deleteProjectForUser: async (id, userId) =>
    api.delete(`/projects/${id}`, { data: userId ? { userId } : undefined }),
  applyToProject: async (projectId, payload) =>
    api.post(`/projects/${projectId}/apply`, payload),
  decideApplication: async (applicationId, action, ownerId) => {
    const url = `/applications/${applicationId}/${action}`;
    console.log('[api] decideApplication ->', API_BASE_URL + url, { ownerId });
    try {
      const res = await api.post(url, ownerId ? { ownerId } : {});
      console.log('[api] decideApplication success', res.status);
      return res;
    } catch (err) {
      console.log('[api] decideApplication error', err?.response?.status, err?.message);
      throw err;
    }
  },
  decideApplicationByProject: async (payload) => {
    console.log('[api] decideApplicationByProject ->', API_BASE_URL + '/applications/decide', payload);
    try {
      const res = await api.post('/applications/decide', payload);
      console.log('[api] decideApplicationByProject success', res.status);
      return res;
    } catch (err) {
      console.log('[api] decideApplicationByProject error', err?.response?.status, err?.message);
      throw err;
    }
  },
  getApplicationsForContractor: async (contractorId) =>
    api.get(`/applications/contractor/${contractorId}`),
  deleteApplication: async (applicationId, contractorId) =>
    api.delete(`/applications/${applicationId}`, { data: contractorId ? { contractorId } : {} }),
  getProjectDetails: async (projectId) => api.get(`/projects/${projectId}/details`),
  leaveProject: async (projectId, payload) => api.post(`/projects/${projectId}/leave`, payload),
  getProjectPersonnel: async (projectId, userId) =>
    api.get(`/projects/${projectId}/personnel`, { params: { userId } }),
  addProjectPersonnel: async (projectId, payload) =>
    api.post(`/projects/${projectId}/personnel`, payload),
  deleteProjectPersonnel: async (projectId, personId, payload) =>
    api.delete(`/projects/${projectId}/personnel/${personId}`, { data: payload }),
  proposeGeneratedContract: async (projectId, payload) =>
    api.post(`/projects/${projectId}/contracts/propose`, payload),
  listGeneratedContracts: async (projectId) => api.get(`/projects/${projectId}/contracts`),
  getGeneratedContract: async (projectId, contractId) =>
    api.get(`/projects/${projectId}/contracts/${contractId}`),
  updateGeneratedContract: async (projectId, contractId, payload) =>
    api.put(`/projects/${projectId}/contracts/${contractId}`, payload),
  listApprovedContractsForContractor: async (contractorId) =>
    api.get(`/contracts/approved/${contractorId}`),
  listApprovedContractsForUser: async (userId) => api.get(`/contracts/approved/user/${userId}`),
  deleteGeneratedContract: async (projectId, contractId, payload) =>
    api.delete(`/projects/${projectId}/contracts/${contractId}`, { data: payload }),
  signGeneratedContract: async (projectId, contractId, payload) =>
    api.post(`/projects/${projectId}/contracts/${contractId}/sign`, payload),
  getUserContracts: async (userId) => api.get(`/contracts/user/${userId}`),
  createContract: async (payload) => api.post('/contracts', payload),
  deleteContract: async (contractId, payload) =>
    api.delete(`/contracts/${contractId}`, { data: payload }),
  getContractsForProject: async (projectId) => api.get(`/contracts/project/${projectId}`),
  getContract: async (contractId) => api.get(`/contracts/${contractId}`),
  signContract: async (contractId, payload) => api.post(`/contracts/${contractId}/sign`, payload),
  postWorkGig: async (projectId, payload) => api.post(`/projects/${projectId}/gigs`, payload),
  listOpenGigs: async (workerId) =>
    api.get('/gigs/open', { params: workerId ? { workerId } : {} }),
  applyToGig: async (gigId, payload) => api.post(`/gigs/${gigId}/apply`, payload),
  listGigApplications: async (workerId) => api.get('/gigs/applications', { params: { workerId } }),
  withdrawGigApplication: async (applicationId, payload) =>
    api.delete(`/gigs/applications/${applicationId}`, { data: payload }),
  savePortfolio: async (payload) => api.post('/portfolio', payload),
  getPortfolio: async (contractorId) => api.get(`/contractors/${contractorId}/portfolio`),
  addPortfolioMedia: async (portfolioId, media) =>
    api.post(`/portfolio/${portfolioId}/media`, { media }),
  createReview: async (payload) => api.post('/reviews', payload),
  getReviews: async (contractorId) => api.get(`/contractors/${contractorId}/reviews`),
  respondReview: async (reviewId, payload) => api.post(`/reviews/${reviewId}/respond`, payload),
  flagReview: async (reviewId) => api.post(`/reviews/${reviewId}/flag`),
  getAudit: async (params) => api.get('/audit', { params }),
  appendAudit: async (payload) => api.post('/audit', payload),
  getCompliance: async (userId) => api.get(`/compliance/user/${userId}`),
  uploadCompliance: async (payload) => api.post('/compliance', payload),
  getAdminAnalytics: async (headers) => api.get('/admin/analytics', { headers }),
  getAdminUsers: async (headers) => api.get('/admin/users', { headers }),
  getAdminDisputes: async (headers) => api.get('/admin/disputes', { headers }),
  resolveDispute: async (id, payload, headers) =>
    api.post(`/admin/disputes/${id}/resolve`, payload, { headers }),
  searchContractors: async (params) => api.get('/contractors/search', { params }),
  getContractorProfile: async (contractorId) => api.get(`/contractors/${contractorId}/profile`),
};

export const paymentsAPI = {
  createStripeAccountLink: async (contractorId) =>
    api.post('/stripe/connect/account-link', { contractorId, userId: contractorId }),
  getStripeStatus: async (contractorId) =>
    api.get('/stripe/connect/status', { params: { contractorId, userId: contractorId } }),
};

export const walletAPI = {
  getBalance: async () => api.get('/wallet/balance'),
  addTestFunds: async () => api.post('/wallet/add-test-funds'),
};

export const messageAPI = {
  list: async (projectId, userId) =>
    api.get(`/projects/${projectId}/messages`, { params: { userId } }),
  send: async (projectId, payload) => api.post(`/projects/${projectId}/messages`, payload),
  update: async (projectId, messageId, payload) =>
    api.put(`/projects/${projectId}/messages/${messageId}`, payload),
  remove: async (projectId, messageId, payload) =>
    api.delete(`/projects/${projectId}/messages/${messageId}`, { data: payload }),
};

// Invoice API calls (mocked for now)
export const invoiceAPI = {
  listInvoices: async () => {
    // return api.get('/invoices');
    return Promise.resolve({ data: [] });
  },
  saveInvoice: async (invoice) => {
    // return api.post('/invoices', invoice);
    return Promise.resolve({ data: invoice });
  },
  updateInvoice: async (invoice) => {
    // return api.put(`/invoices/${invoice.id}`, invoice);
    return Promise.resolve({ data: invoice });
  },
  uploadFile: async (fileUri) => {
    // return api.post('/uploads', { fileUri });
    return Promise.resolve({
      data: {
        fileUri,
        thumbnailUri: fileUri,
      },
    });
  },
};

export const userAPI = {
  listWorkers: async () => api.get('/users/worker'),
};

// Feature Flags API
export const featureFlagsAPI = {
  getAllFlags: async () => api.get('/feature-flags'),
  getFlag: async (featureName) => api.get(`/feature-flags/${featureName}`),
  toggleFlag: async (featureName, enabled, description) =>
    api.put(`/feature-flags/${featureName}`, { enabled, description }),
};

export default api;
