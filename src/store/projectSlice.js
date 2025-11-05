import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    fetchProjectsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchProjectsSuccess: (state, action) => {
      state.isLoading = false;
      state.projects = action.payload;
    },
    fetchProjectsFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    },
    addProject: (state, action) => {
      state.projects.push(action.payload);
    },
    updateProject: (state, action) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
    },
    deleteProject: (state, action) => {
      state.projects = state.projects.filter(p => p.id !== action.payload);
    },
    clearProjects: (state) => {
      state.projects = [];
      state.currentProject = null;
    },
  },
});

export const {
  fetchProjectsStart,
  fetchProjectsSuccess,
  fetchProjectsFailure,
  setCurrentProject,
  addProject,
  updateProject,
  deleteProject,
  clearProjects,
} = projectSlice.actions;

export default projectSlice.reducer;