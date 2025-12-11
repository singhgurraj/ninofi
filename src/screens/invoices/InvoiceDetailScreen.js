import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { markInvoiceStatus } from '../../store/invoiceSlice';
import palette from '../../styles/palette';

const InvoiceDetailScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { invoiceId } = route.params || {};
  const invoice = useSelector((state) =>
    state.invoices.invoices.find((inv) => inv.id === invoiceId)
  );
  const totalDisplay = (invoice?.totalAmount ?? invoice?.amount ?? 0);

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.missingState}>
          <Text style={styles.missingText}>Invoice not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const togglePaid = () => {
    const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
    dispatch(markInvoiceStatus({ id: invoice.id, status: newStatus }));
    Alert.alert('Updated', `Invoice marked as ${newStatus}.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Details</Text>
          <TouchableOpacity onPress={() => navigation.navigate('InvoiceEdit', { invoiceId })}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.vendor}>{invoice.vendorName}</Text>
          <Text style={styles.invoiceNumber}>
            {invoice.invoiceNumber || 'No invoice number'} · {invoice.currency}
          </Text>

          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amountValue}>${totalDisplay.toLocaleString()}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{invoice.status.replace(/_/g, ' ')}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>
              {new Date(invoice.issueDate).toLocaleDateString()}
            </Text>
          </View>
          {invoice.dueDate && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due</Text>
              <Text style={styles.metaValue}>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          {invoice.projectName && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Project</Text>
              <Text style={styles.metaValue}>{invoice.projectName}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Category</Text>
            <Text style={styles.metaValue}>{invoice.category || 'Not set'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Amount</Text>
            <Text style={styles.metaValue}>${invoice.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tax</Text>
            <Text style={styles.metaValue}>${(invoice.taxAmount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>File</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {invoice.fileUri}
            </Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, invoice.status === 'paid' && styles.secondaryButton]}
            onPress={togglePaid}
          >
            <Text style={styles.primaryText}>
              {invoice.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('InvoiceEdit', { invoiceId })}
          >
            <Text style={styles.secondaryText}>Edit details</Text>
          </TouchableOpacity>
        </View>
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
  backText: {
    fontSize: 22,
    color: palette.text,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.text,
  },
  editText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 14,
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
  vendor: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.text,
  },
  invoiceNumber: {
    color: palette.muted,
    marginTop: 4,
    fontSize: 13.5,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  amountLabel: {
    color: palette.muted,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.text,
  },
  statusPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusText: {
    color: palette.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaLabel: {
    color: palette.muted,
    fontSize: 13.5,
  },
  metaValue: {
    color: palette.text,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
    marginBottom: 10,
  },
  notes: {
    color: palette.text,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#F3ECFF',
  },
  secondaryText: {
    color: palette.text,
    fontWeight: '800',
  },
  missingState: {
    padding: 20,
  },
  missingText: {
    color: palette.text,
    fontSize: 16,
  },
});

export default InvoiceDetailScreen;
