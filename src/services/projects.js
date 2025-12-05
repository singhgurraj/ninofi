import {
  addProject,
  fetchProjectsFailure,
  fetchProjectsStart,
  fetchProjectsSuccess,
  updateProject,
  deleteProject,
  fetchOpenProjectsStart,
  fetchOpenProjectsSuccess,
  fetchOpenProjectsFailure,
  applyForProject,
  fetchContractorProjectsStart,
  fetchContractorProjectsSuccess,
  fetchContractorProjectsFailure,
  withdrawApplicationLocal,
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

export const loadOpenProjects = (contractorId) => async (dispatch) => {
  try {
    dispatch(fetchOpenProjectsStart());
    const response = await projectAPI.getOpenProjects(contractorId);
    dispatch(fetchOpenProjectsSuccess(response.data || []));
    return { success: true };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load projects';
    dispatch(fetchOpenProjectsFailure(message));
    return { success: false, error: message };
  }
};

export const applyToProject = (projectId, contractorId, message) => async (dispatch) => {
  if (!projectId || !contractorId) return { success: false, error: 'Missing projectId/contractorId' };
  try {
    await projectAPI.applyToProject(projectId, { contractorId, message });
    dispatch(applyForProject(projectId));
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to apply';
    return { success: false, error: msg };
  }
};

export const loadContractorProjects = (contractorId) => async (dispatch) => {
  if (!contractorId) return { success: false, error: 'Missing contractorId' };
  try {
    dispatch(fetchContractorProjectsStart());
    const response = await projectAPI.getProjectsForContractor(contractorId);
    dispatch(fetchContractorProjectsSuccess(response.data || []));
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to load projects';
    dispatch(fetchContractorProjectsFailure(msg));
    return { success: false, error: msg };
  }
};

export const loadContractorApplications = (contractorId) => projectAPI.getApplicationsForContractor(contractorId);

export const withdrawApplication = (applicationId, projectId, contractorId) => async (dispatch) => {
  const res = await projectAPI.deleteApplication(applicationId, contractorId);
  const pid = projectId || res?.data?.projectId;
  if (pid) {
    dispatch(withdrawApplicationLocal(pid));
  }
  if (contractorId) {
    dispatch(loadOpenProjects(contractorId));
    dispatch(loadContractorProjects(contractorId));
  }
};

export const getProjectDetails = (projectId) => projectAPI.getProjectDetails(projectId);

export const leaveProject = async (projectId, payload, dispatch) => {
  if (!projectId) {
    return { success: false, error: 'Missing projectId' };
  }
  try {
    await projectAPI.leaveProject(projectId, payload);
    if (dispatch && payload?.contractorId) {
      dispatch(loadOpenProjects(payload.contractorId));
      dispatch(loadContractorProjects(payload.contractorId));
    }
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to leave project';
    return { success: false, error: msg };
  }
};
