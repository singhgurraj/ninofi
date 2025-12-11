import { createSlice } from '@reduxjs/toolkit';

const isAdminFromUser = (user) => {
  if (!user) return false;
  if (user.isAdmin) return true;
  if ((user.userRole || '').toUpperCase() === 'ADMIN') return true;
  if ((user.role || '').toUpperCase() === 'ADMIN') return true;
  return false;
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  role: null, // 'homeowner', 'contractor', 'worker'
  isAdmin: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.isAdmin = false;
    },
    loginSuccess: (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.user.role;
      state.isAdmin = isAdminFromUser(action.payload.user);
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.role = null;
      state.isAdmin = false;
    },
    registerStart: (state) => {
      state.isLoading = true;
      state.error = null;
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.isAdmin = false;
    },
    registerSuccess: (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.user.role;
      state.isAdmin = isAdminFromUser(action.payload.user);
      state.error = null;
    },
    registerFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.role = null;
      state.isAdmin = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.role = null;
      state.isAdmin = false;
      state.error = null;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state) => {
      // Do not persist admin mode; require fresh login to enable it.
      state.isAdmin = false;
    });
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logout,
  setRole,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
