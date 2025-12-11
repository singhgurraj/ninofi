import { createSlice } from '@reduxjs/toolkit';

const defaultProjects = [
  {
    id: '1',
    title: 'Kitchen Renovation',
    contractor: 'BuildCorp Contractors',
    status: 'In Progress',
    progress: 65,
    budget: 8500,
    milestones: [
      { id: 'm1', name: 'Demo & Prep Work', amount: 2500, status: 'approved' },
      { id: 'm2', name: 'Plumbing Installation', amount: 3000, status: 'submitted' },
    ],
  },
  {
    id: '2',
    title: 'Bathroom Remodel',
    contractor: 'ProTile Solutions',
    status: 'Pending Approval',
    progress: 90,
    budget: 4000,
    milestones: [
      { id: 'm3', name: 'Tile Installation', amount: 1800, status: 'approved' },
      { id: 'm4', name: 'Final Inspection', amount: 2200, status: 'pending' },
    ],
  },
];

const initialState = {
  projects: defaultProjects,
  currentProject: null,
  isLoading: false,
  error: null,
  openProjects: [],
  isLoadingOpen: false,
  openError: null,
  appliedProjectIds: [],
  contractorProjects: [],
  isLoadingContractor: false,
  contractorError: null,
  workerAssignments: [],
  workerProjects: [],
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
      state.appliedProjectIds = [];
      state.openProjects = [];
    },
    fetchOpenProjectsStart: (state) => {
      state.isLoadingOpen = true;
      state.openError = null;
    },
    fetchOpenProjectsSuccess: (state, action) => {
      state.isLoadingOpen = false;
      state.openProjects = action.payload;
    },
    fetchOpenProjectsFailure: (state, action) => {
      state.isLoadingOpen = false;
      state.openError = action.payload;
    },
    applyForProject: (state, action) => {
      const projectId = action.payload;
      if (projectId && !state.appliedProjectIds.includes(projectId)) {
        state.appliedProjectIds.push(projectId);
        state.openProjects = state.openProjects.filter((p) => p.id !== projectId);
      }
    },
    withdrawApplicationLocal: (state, action) => {
      const projectId = action.payload;
      state.appliedProjectIds = state.appliedProjectIds.filter((x) => x !== projectId);
    },
    fetchContractorProjectsStart: (state) => {
      state.isLoadingContractor = true;
      state.contractorError = null;
    },
    fetchContractorProjectsSuccess: (state, action) => {
      state.isLoadingContractor = false;
      state.contractorProjects = action.payload;
    },
    fetchContractorProjectsFailure: (state, action) => {
      state.isLoadingContractor = false;
      state.contractorError = action.payload;
    },
    addWorkerAssignment: (state, action) => {
      const existing = state.workerAssignments.find((a) => a.id === action.payload.id);
      const base = {
        id: action.payload.id,
        projectId: action.payload.projectId,
        workerId: action.payload.workerId,
        description: action.payload.description,
        dueDate: action.payload.dueDate,
        pay: action.payload.pay,
        status: action.payload.status,
        proofImageUrl: action.payload.proofImageUrl,
        createdAt: action.payload.createdAt || new Date().toISOString(),
      };
      if (existing) {
        Object.assign(existing, base);
      } else {
        state.workerAssignments.push(base);
      }
    },
    updateWorkerAssignment: (state, action) => {
      const existing = state.workerAssignments.find((a) => a.id === action.payload.id);
      if (existing) {
        Object.assign(existing, action.payload);
      }
    },
    addWorkerProject: (state, action) => {
      if (!action.payload?.id) return;
      const exists = state.workerProjects.find((p) => p.id === action.payload.id);
      if (exists) {
        Object.assign(exists, action.payload);
      } else {
        state.workerProjects.push(action.payload);
      }
    },
    removeWorkerProject: (state, action) => {
      const projectId = action.payload;
      if (!projectId) return;
      state.workerProjects = state.workerProjects.filter((p) => p.id !== projectId);
      state.workerAssignments = state.workerAssignments.filter((a) => a.projectId !== projectId);
    },
    removeWorkerAssignmentsByProject: (state, action) => {
      const projectId = action.payload;
      if (!projectId) return;
      state.workerAssignments = state.workerAssignments.filter((a) => a.projectId !== projectId);
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
  fetchOpenProjectsStart,
  fetchOpenProjectsSuccess,
  fetchOpenProjectsFailure,
  applyForProject,
  withdrawApplicationLocal,
  fetchContractorProjectsStart,
  fetchContractorProjectsSuccess,
  fetchContractorProjectsFailure,
  addWorkerAssignment,
  removeWorkerAssignmentsByProject,
  updateWorkerAssignment,
  addWorkerProject,
  removeWorkerProject,
} = projectSlice.actions;

export default projectSlice.reducer;
