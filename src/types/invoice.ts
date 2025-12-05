export type InvoiceStatus = 'unassigned' | 'attached_to_project' | 'paid' | 'unpaid';

export type InvoiceCategory = 'materials' | 'labor' | 'equipment' | 'permit' | 'other';

export type Invoice = {
  id: string;
  vendorName: string;
  invoiceNumber?: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  currency: 'USD';
  issueDate: string;
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  category?: InvoiceCategory;
  status: InvoiceStatus;
  notes?: string;
  fileUri: string;
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
};
