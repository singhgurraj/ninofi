import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  addInvoice,
  updateInvoice,
} from '../../store/invoiceSlice';
import {
  saveInvoiceToCloud,
  updateInvoiceInCloud,
  uploadInvoiceFile,
} from '../../services/invoices';
import palette from '../../styles/palette';

const statuses = ['unassigned', 'attached_to_project', 'unpaid', 'paid'];
const categories = ['materials', 'labor', 'equipment', 'permit', 'other'];

const InvoiceEditScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const invoices = useSelector((state) => state.invoices.invoices);
  const { invoiceId, draftInvoice } = route.params || {};
  const existingInvoice = draftInvoice || invoices.find((inv) => inv.id === invoiceId);
  const now = new Date().toISOString();

  const [form, setForm] = useState({
    vendorName: existingInvoice?.vendorName || '',
    invoiceNumber: existingInvoice?.invoiceNumber || '',
    amount: existingInvoice?.amount ? existingInvoice.amount.toString() : '',
    taxAmount: existingInvoice?.taxAmount ? existingInvoice.taxAmount.toString() : '',
    issueDate: existingInvoice?.issueDate || now,
    dueDate: existingInvoice?.dueDate || '',
    projectId: existingInvoice?.projectId || '',
    projectName: existingInvoice?.projectName || '',
    category: existingInvoice?.category || 'materials',
    status: existingInvoice?.status || 'unassigned',
    notes: existingInvoice?.notes || '',
    fileUri: existingInvoice?.fileUri || '',
    thumbnailUri: existingInvoice?.thumbnailUri || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const totalAmount = useMemo(() => {
    const baseAmount = parseFloat(form.amount) || 0;
    const tax = parseFloat(form.taxAmount) || 0;
    return baseAmount + tax;
  }, [form.amount, form.taxAmount]);

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const prepareDraftForUpload = () => {
    const baseAmount = parseFloat(form.amount) || 0;
    const baseTax = parseFloat(form.taxAmount) || 0;
    return {
      id: existingInvoice?.id || `draft-${Date.now()}`,
      vendorName: form.vendorName,
      invoiceNumber: form.invoiceNumber,
      amount: baseAmount,
      taxAmount: baseTax,
      totalAmount: baseAmount + baseTax,
      currency: 'USD',
      issueDate: form.issueDate,
      dueDate: form.dueDate || undefined,
      projectId: form.projectId || undefined,
      projectName: form.projectName || undefined,
      category: form.category,
      status: form.status,
      notes: form.notes,
      fileUri: form.fileUri,
      thumbnailUri: form.thumbnailUri,
      createdAt: existingInvoice?.createdAt || now,
      updatedAt: now,
    };
  };

  const handleSave = async () => {
    if (!form.vendorName.trim()) {
      Alert.alert('Vendor required', 'Please add the vendor or supplier name.');
      return;
    }

    if (!form.fileUri) {
      Alert.alert('Missing file', 'Attach a scanned invoice before saving.');
      return;
    }

    const amountValue = parseFloat(form.amount);
    if (Number.isNaN(amountValue)) {
      Alert.alert('Invalid amount', 'Enter the invoice amount as a number.');
      return;
    }

    const taxValue = parseFloat(form.taxAmount) || 0;
    const invoicePayload = {
      id: existingInvoice?.id || `inv-${Date.now()}`,
      vendorName: form.vendorName.trim(),
      invoiceNumber: form.invoiceNumber?.trim() || undefined,
      amount: amountValue,
      taxAmount: taxValue,
      totalAmount: totalAmount || amountValue,
      currency: 'USD',
      issueDate: form.issueDate,
      dueDate: form.dueDate || undefined,
      projectId: form.projectId || undefined,
      projectName: form.projectName?.trim() || undefined,
      category: form.category,
      status: form.status,
      notes: form.notes?.trim() || undefined,
      fileUri: form.fileUri,
      thumbnailUri: form.thumbnailUri || form.fileUri,
      createdAt: existingInvoice?.createdAt || now,
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      // Simulate cloud upload + persistence
      if (
        existingInvoice &&
        !String(existingInvoice.id).startsWith('draft-') &&
        form.fileUri === existingInvoice.fileUri
      ) {
        await updateInvoiceInCloud(invoicePayload);
      } else {
        const uploadResult = await uploadInvoiceFile(form.fileUri);
        invoicePayload.fileUri = uploadResult.data.fileUri;
        invoicePayload.thumbnailUri = uploadResult.data.thumbnailUri;
        await saveInvoiceToCloud(invoicePayload);
      }

      if (existingInvoice?.id && !existingInvoice.id.startsWith('draft-')) {
        dispatch(updateInvoice(invoicePayload));
      } else {
        dispatch(addInvoice(invoicePayload));
      }

      navigation.replace('InvoiceDetail', { invoiceId: invoicePayload.id });
    } catch (error) {
      Alert.alert('Save failed', 'Unable to sync invoice to the cloud right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{existingInvoice ? 'Edit Invoice' : 'New Invoice'}</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vendor & Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Vendor name"
            value={form.vendorName}
            onChangeText={(text) => onChange('vendorName', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Invoice number"
            value={form.invoiceNumber}
            onChangeText={(text) => onChange('invoiceNumber', text)}
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Amount"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(text) => onChange('amount', text)}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Tax"
              keyboardType="numeric"
              value={form.taxAmount}
              onChangeText={(text) => onChange('taxAmount', text)}
            />
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total (USD)</Text>
            <Text style={styles.totalValue}>${totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Project & Dates</Text>
          <TextInput
            style={styles.input}
            placeholder="Project name"
            value={form.projectName}
            onChangeText={(text) => onChange('projectName', text)}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Issue date (ISO)"
              value={form.issueDate}
              onChangeText={(text) => onChange('issueDate', text)}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Due date (ISO)"
              value={form.dueDate}
              onChangeText={(text) => onChange('dueDate', text)}
            />
          </View>

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  form.category === cat && styles.chipActive,
                ]}
                onPress={() => onChange('category', cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.category === cat && styles.chipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.chipRow}>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.chip,
                  form.status === status && styles.chipActive,
                ]}
                onPress={() => onChange('status', status)}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.status === status && styles.chipTextActive,
                  ]}
                >
                  {status.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Notes, payment terms, reference numbers..."
            multiline
            numberOfLines={4}
            value={form.notes}
            onChangeText={(text) => onChange('notes', text)}
          />
          <Text style={styles.fileLabel}>Attached file</Text>
          <View style={styles.fileRow}>
            <Text style={styles.fileName} numberOfLines={1}>
              {form.fileUri || 'No file attached'}
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ScanOrUploadInvoice', {
                  draftInvoice: prepareDraftForUpload(),
                })
              }
            >
              <Text style={styles.replaceFile}>Replace</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Save invoice</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    backgroundColor: palette.surface,
    borderRadius: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.text,
  },
  backText: {
    fontSize: 22,
    color: palette.text,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
    color: palette.text,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    color: palette.muted,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.text,
  },
  fieldLabel: {
    fontWeight: '700',
    color: palette.text,
    marginTop: 6,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    color: palette.text,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  fileLabel: {
    color: palette.muted,
    marginTop: 6,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fileName: {
    flex: 1,
    marginRight: 10,
    color: palette.text,
  },
  replaceFile: {
    color: palette.primary,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default InvoiceEditScreen;
