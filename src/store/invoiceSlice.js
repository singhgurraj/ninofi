import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  invoices: [],
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
};

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setInvoices: (state, action) => {
      state.invoices = action.payload;
    },
    addInvoice: (state, action) => {
      state.invoices.unshift(action.payload);
    },
    updateInvoice: (state, action) => {
      const index = state.invoices.findIndex((inv) => inv.id === action.payload.id);
      if (index !== -1) {
        state.invoices[index] = {
          ...state.invoices[index],
          ...action.payload,
          updatedAt: action.payload.updatedAt || new Date().toISOString(),
        };
      }
    },
    deleteInvoice: (state, action) => {
      state.invoices = state.invoices.filter((inv) => inv.id !== action.payload);
    },
    markInvoiceStatus: (state, action) => {
      const { id, status } = action.payload;
      const invoice = state.invoices.find((inv) => inv.id === id);
      if (invoice) {
        invoice.status = status;
        invoice.updatedAt = new Date().toISOString();
      }
    },
    startSync: (state) => {
      state.isSyncing = true;
      state.error = null;
    },
    syncSuccess: (state) => {
      state.isSyncing = false;
      state.lastSyncedAt = new Date().toISOString();
    },
    syncFailure: (state, action) => {
      state.isSyncing = false;
      state.error = action.payload;
    },
  },
});

export const {
  setInvoices,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceStatus,
  startSync,
  syncSuccess,
  syncFailure,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;
