import axios from 'axios';

// TODO: Replace with your actual backend URL
const API_BASE_URL = 'http://localhost:5000/api';

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

// In-memory store for mock users (temporary until backend is built)
const mockUsers = {};

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    // TODO: Connect to actual backend
    // return api.post('/auth/login', { email, password });
    
    // Mock response for now
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Check if user exists in our mock store
        const user = mockUsers[email];
        
        if (user && user.password === password) {
          // User exists and password matches
          resolve({
            data: {
              user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
              },
              token: 'mock-jwt-token-' + Date.now(),
            },
          });
        } else if (user) {
          // User exists but wrong password
          reject(new Error('Invalid password'));
        } else {
          // User doesn't exist - create default homeowner for demo
          resolve({
            data: {
              user: {
                id: '1',
                email,
                fullName: email.split('@')[0],
                role: 'homeowner',
              },
              token: 'mock-jwt-token-' + Date.now(),
            },
          });
        }
      }, 1000);
    });
  },

  register: async (userData) => {
    // TODO: Connect to actual backend
    // return api.post('/auth/register', userData);
    
    // Mock response for now
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Check if user already exists
        if (mockUsers[userData.email]) {
          reject(new Error('User already exists'));
          return;
        }

        // Create new user
        const newUser = {
          id: Date.now().toString(),
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role || 'homeowner',
          password: userData.password, // Store password for mock login
        };

        // Save to mock store
        mockUsers[userData.email] = newUser;

        console.log('Registered user:', newUser.email, 'as', newUser.role);
        console.log('All users:', Object.keys(mockUsers));

        resolve({
          data: {
            user: {
              id: newUser.id,
              email: newUser.email,
              fullName: newUser.fullName,
              role: newUser.role,
            },
            token: 'mock-jwt-token-' + Date.now(),
          },
        });
      }, 1000);
    });
  },

  logout: async () => {
    // TODO: Connect to actual backend
    // return api.post('/auth/logout');
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