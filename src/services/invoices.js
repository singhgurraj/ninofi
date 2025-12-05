import { invoiceAPI } from './api';

export const uploadInvoiceFile = async (fileUri) => {
  return invoiceAPI.uploadFile(fileUri);
};

export const saveInvoiceToCloud = async (invoice) => {
  return invoiceAPI.saveInvoice(invoice);
};

export const updateInvoiceInCloud = async (invoice) => {
  return invoiceAPI.updateInvoice(invoice);
};

export const fetchInvoicesFromCloud = async () => {
  return invoiceAPI.listInvoices();
};
