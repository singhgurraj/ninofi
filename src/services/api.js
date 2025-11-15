import Constants from 'expo-constants';
import axios from 'axios';

const resolveBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const host =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    Constants.manifest?.debuggerHost?.split(':')[0];

  if (host) {
    return `http://${host}:3001/api`;
  }

  return 'http://127.0.0.1:3001/api';
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
    // Token will be added here once we have it
    // const token = store.getState().auth.token;
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
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

// Project API calls
export const projectAPI = {
  getProjects: async () => {
    // return api.get('/projects');
    return Promise.resolve({ data: [] });
  },

  getProjectById: async (id) => {
    // return api.get(`/projects/${id}`);
    return Promise.resolve({ data: {} });
  },

  createProject: async (projectData) => {
    // return api.post('/projects', projectData);
    return Promise.resolve({ data: projectData });
  },

  updateProject: async (id, projectData) => {
    // return api.put(`/projects/${id}`, projectData);
    return Promise.resolve({ data: projectData });
  },

  deleteProject: async (id) => {
    // return api.delete(`/projects/${id}`);
    return Promise.resolve({ data: { id } });
  },
};

export default api;
