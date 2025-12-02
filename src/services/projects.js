import {
  addProject,
  fetchProjectsFailure,
  fetchProjectsStart,
  fetchProjectsSuccess,
  updateProject,
  deleteProject,
} from '../store/projectSlice';
import { projectAPI } from './api';

export const loadProjectsForUser = (userId) => async (dispatch) => {
  if (!userId) return;
  try {
    dispatch(fetchProjectsStart());
    const response = await projectAPI.getProjectsForUser(userId);
    dispatch(fetchProjectsSuccess(response.data || []));
    return { success: true };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load projects';
    dispatch(fetchProjectsFailure(message));
    return { success: false, error: message };
  }
};

export const saveProject = (project) => async (dispatch) => {
  if (!project?.userId || !project?.title) {
    return { success: false, error: 'Missing userId or title' };
  }

  try {
    const hasId = Boolean(project.id);
    const response = hasId
      ? await projectAPI.updateProject(project.id, project)
      : await projectAPI.createProject(project);
    const saved = response.data;
    if (hasId) {
      dispatch(updateProject(saved));
    } else {
      dispatch(addProject(saved));
    }
    return { success: true, data: saved };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to save project';
    return { success: false, error: message };
  }
};

export const removeProject = (projectId, userId) => async (dispatch) => {
  if (!projectId) return { success: false, error: 'Missing projectId' };
  try {
    const apiFn = projectAPI.deleteProjectForUser || projectAPI.deleteProject;
    await apiFn(projectId, userId);
    dispatch(deleteProject(projectId));
    return { success: true };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to delete project';
    return { success: false, error: message };
  }
};
