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
  decideApplication: async (applicationId, action, ownerId) =>
    api.post(`/applications/${applicationId}/${action}`, ownerId ? { ownerId } : {}),
  decideApplicationByProject: async (payload) => api.post('/applications/decide', payload),
  getApplicationsForContractor: async (contractorId) =>
    api.get(`/applications/contractor/${contractorId}`),
  deleteApplication: async (applicationId, contractorId) =>
    api.delete(`/applications/${applicationId}`, { data: contractorId ? { contractorId } : {} }),
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

export default api;
