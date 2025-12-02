import Constants from 'expo-constants';
import axios from 'axios';

let authToken = null;

const resolveBaseUrl = () => {
  // Preferred: explicit env var for Railway
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallbacks for local dev via Expo tunnels/lan
  const host =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    Constants.manifest?.debuggerHost?.split(':')[0];

  if (host) {
    return `http://${host}:3001/api`;
  }

  return 'http://localhost:3001/api';
};

const API_BASE_URL = resolveBaseUrl();

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
  createProject: async (projectData) => api.post('/projects', projectData),
  updateProject: async (id, projectData) => api.put(`/projects/${id}`, projectData),
  deleteProject: async (id) => api.delete(`/projects/${id}`),
  deleteProjectForUser: async (id, userId) =>
    api.delete(`/projects/${id}`, { data: userId ? { userId } : undefined }),
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
