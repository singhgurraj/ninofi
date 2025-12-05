import { createSlice } from '@reduxjs/toolkit';

const sampleInvoices = [
  {
    id: 'inv-1',
    vendorName: 'Madison Lumber Co.',
    invoiceNumber: 'INV-2025-014',
    amount: 1800,
    taxAmount: 144,
    totalAmount: 1944,
    currency: 'USD',
    issueDate: '2025-01-05T12:00:00.000Z',
    dueDate: '2025-02-04T12:00:00.000Z',
    projectId: '1',
    projectName: 'Kitchen Renovation',
    category: 'materials',
    status: 'attached_to_project',
    notes: 'Cabinet frames, plywood, and fasteners.',
    fileUri: 'https://example.com/invoices/inv-1.pdf',
    thumbnailUri: 'https://example.com/invoices/inv-1-thumb.jpg',
    createdAt: '2025-01-05T12:00:00.000Z',
    updatedAt: '2025-01-06T15:20:00.000Z',
  },
  {
    id: 'inv-2',
    vendorName: 'BrightWorks Electrical',
    invoiceNumber: 'BW-7729',
    amount: 1200,
    taxAmount: 96,
    totalAmount: 1296,
    currency: 'USD',
    issueDate: '2025-01-12T12:00:00.000Z',
    dueDate: '2025-01-27T12:00:00.000Z',
    projectId: '2',
    projectName: 'Bathroom Remodel',
    category: 'labor',
    status: 'unpaid',
    notes: 'Rough-in wiring and panel upgrades.',
    fileUri: 'https://example.com/invoices/inv-2.pdf',
    thumbnailUri: 'https://example.com/invoices/inv-2-thumb.jpg',
    createdAt: '2025-01-12T12:00:00.000Z',
    updatedAt: '2025-01-12T12:00:00.000Z',
  },
  {
    id: 'inv-3',
    vendorName: 'Permit Office',
    invoiceNumber: 'PER-3341',
    amount: 400,
    taxAmount: 0,
    totalAmount: 400,
    currency: 'USD',
    issueDate: '2024-12-28T12:00:00.000Z',
    dueDate: '2025-01-15T12:00:00.000Z',
    projectId: '1',
    projectName: 'Kitchen Renovation',
    category: 'permit',
    status: 'paid',
    notes: 'City inspection and permit renewal.',
    fileUri: 'https://example.com/invoices/inv-3.pdf',
    thumbnailUri: 'https://example.com/invoices/inv-3-thumb.jpg',
    createdAt: '2024-12-28T12:00:00.000Z',
    updatedAt: '2024-12-30T09:00:00.000Z',
  },
];

const initialState = {
  invoices: sampleInvoices,
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
