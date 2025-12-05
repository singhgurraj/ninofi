import { projectAPI } from './api';

export const submitReview = async (payload) => {
  if (!payload?.contractorId || !payload?.reviewerId || !payload?.ratingOverall) {
    return { success: false, error: 'Missing contractorId/reviewerId/ratingOverall' };
  }
  try {
    const res = await projectAPI.createReview(payload);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to submit review';
    return { success: false, error: message };
  }
};

export const fetchReviews = async (contractorId) => {
  if (!contractorId) return { success: false, error: 'contractorId is required' };
  try {
    const res = await projectAPI.getReviews(contractorId);
    return { success: true, data: res.data || [] };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load reviews';
    return { success: false, error: message };
  }
};

export const respondToReview = async (reviewId, responseText) => {
  if (!reviewId) return { success: false, error: 'reviewId is required' };
  try {
    const res = await projectAPI.respondReview(reviewId, { responseText });
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to respond';
    return { success: false, error: message };
  }
};

export const flagReview = async (reviewId) => {
  if (!reviewId) return { success: false, error: 'reviewId is required' };
  try {
    const res = await projectAPI.flagReview(reviewId);
    return { success: true, data: res.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to flag review';
    return { success: false, error: message };
  }
};
