import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';

const statusColor = {
  unassigned: '#9CA3AF',
  attached_to_project: '#2563EB',
  unpaid: '#D97706',
  paid: '#16A34A',
};

const InvoiceListScreen = ({ navigation }) => {
  const invoices = useSelector((state) => state.invoices.invoices);
  const outstandingTotal = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === 'unpaid')
        .reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0),
    [invoices]
  );
  const paidTotal = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0),
    [invoices]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Invoices</Text>
          <Text style={styles.subtitle}>Upload, track, and sync to the cloud</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ScanOrUploadInvoice')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={styles.summaryValue}>${outstandingTotal.toLocaleString()}</Text>
          <Text style={styles.summaryHint}>Unpaid invoices</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={styles.summaryValue}>${paidTotal.toLocaleString()}</Text>
          <Text style={styles.summaryHint}>Recorded payments</Text>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {invoices.map((invoice) => {
          const chipColor = statusColor[invoice.status] || palette.muted;
          return (
            <TouchableOpacity
              key={invoice.id}
              style={styles.card}
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.vendor}>{invoice.vendorName}</Text>
                  <Text style={styles.invoiceNumber}>
                    {invoice.invoiceNumber || 'No invoice #'} · {invoice.currency}
                  </Text>
                </View>
                <Text style={styles.amount}>${(invoice.totalAmount || invoice.amount).toLocaleString()}</Text>
              </View>
              <View style={styles.cardMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeIcon}>📁</Text>
                  <Text style={styles.badgeText}>{invoice.projectName || 'Unassigned'}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${chipColor}20` }]}>
                  <Text style={[styles.statusText, { color: chipColor }]}>
                    {invoice.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <View style={styles.datesRow}>
                <Text style={styles.dateLabel}>
                  Issued {new Date(invoice.issueDate).toLocaleDateString()}
                </Text>
                {invoice.dueDate && (
                  <Text style={styles.dateLabel}>
                    Due {new Date(invoice.dueDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {!invoices.length && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptyText}>Scan or upload your first invoice to get started.</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ScanOrUploadInvoice')}
            >
              <Text style={styles.emptyButtonText}>Add Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    color: palette.muted,
    marginTop: 6,
  },
  addButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
    color: palette.text,
  },
  summaryHint: {
    color: palette.muted,
    marginTop: 4,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendor: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  invoiceNumber: {
    color: palette.muted,
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3ECFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    color: palette.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'capitalize',
    fontSize: 12,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dateLabel: {
    color: palette.muted,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
  },
  emptyText: {
    color: palette.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  emptyButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default InvoiceListScreen;
