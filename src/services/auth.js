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
import { authAPI, setAuthToken } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = (email, password) => async (dispatch) => {
  try {
    dispatch(loginStart());
    const response = await authAPI.login(email, password);
    dispatch(loginSuccess(response.data));
    setAuthToken(response.data?.token);
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
    setAuthToken(response.data?.token);
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
    setAuthToken(null);
    await AsyncStorage.removeItem('persist:auth');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    dispatch(clearProjects());
    dispatch(logoutAction()); // Logout locally even if API call fails
    setAuthToken(null);
    await AsyncStorage.removeItem('persist:auth');
    return { success: true };
  }
};
