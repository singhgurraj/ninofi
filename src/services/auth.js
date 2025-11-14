import {
  loginFailure,
  loginStart,
  loginSuccess,
  logout as logoutAction,
  registerFailure,
  registerStart,
  registerSuccess,
} from '../store/authSlice';
import { clearProjects } from '../store/projectSlice';
import { authAPI } from './api';

export const login = (email, password) => async (dispatch) => {
  try {
    dispatch(loginStart());
    const response = await authAPI.login(email, password);
    dispatch(loginSuccess(response.data));
    return { success: true };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Login failed';
    dispatch(loginFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

export const register = (userData) => async (dispatch) => {
  try {
    dispatch(registerStart());
    const response = await authAPI.register(userData);
    dispatch(registerSuccess(response.data));
    return { success: true };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Registration failed';
    dispatch(registerFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

export const logout = () => async (dispatch) => {
  try {
    await authAPI.logout();
    dispatch(clearProjects());
    dispatch(logoutAction());
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    dispatch(clearProjects());
    dispatch(logoutAction()); // Logout locally even if API call fails
    return { success: true };
  }
};
