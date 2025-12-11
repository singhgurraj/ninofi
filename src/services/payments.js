import { paymentsAPI } from './api';

export const createConnectAccountLink = async (contractorId) => {
  if (!contractorId) return { success: false, error: 'contractorId is required' };
  try {
    const res = await paymentsAPI.createStripeAccountLink(contractorId);
    return { success: true, data: res.data };
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || 'Failed to start Stripe onboarding';
    return { success: false, error: message };
  }
};

export const fetchStripeStatus = async (contractorId) => {
  if (!contractorId) return { success: false, error: 'contractorId is required' };
  try {
    const res = await paymentsAPI.getStripeStatus(contractorId);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load Stripe status';
    return { success: false, error: message };
  }
};
