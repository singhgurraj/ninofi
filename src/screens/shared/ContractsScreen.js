import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { contractAPI, fetchApprovedContractsForContractor, fetchApprovedContractsForUser } from '../../services/contracts';

const statusStyles = {
  pending: { label: 'Pending', backgroundColor: '#FEF3C7', color: '#D97706' },
  signed: { label: 'Signed', backgroundColor: '#DCFCE7', color: '#16A34A' },
  rejected: { label: 'Rejected', backgroundColor: '#FEE2E2', color: '#DC2626' },
};

const initialFormState = {
  title: '',
  terms: '',
  projectId: '',
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const ContractsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [contracts, setContracts] = useState([]);
  const [approvedGenerated, setApprovedGenerated] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContracts = useCallback(
    async (opts = { refreshing: false }) => {
      if (!user?.id) return;
      if (opts.refreshing) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const roleLower = (user.role || '').toLowerCase();
        const approved =
          roleLower === 'contractor'
            ? await fetchApprovedContractsForContractor(user.id)
            : await fetchApprovedContractsForUser(user.id);
        setApprovedGenerated(approved.success ? approved.data || [] : []);
        setContracts([]);
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load contracts');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, user?.role]
  );

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleRefresh = useCallback(() => {
    fetchContracts({ refreshing: true });
  }, [fetchContracts]);

  const renderContractCard = (contract) => {
    const status = contract.status || 'pending';
    const badge = statusStyles[status] || statusStyles.pending;
    return (
      <TouchableOpacity
        key={contract.id}
        style={styles.card}
        onPress={() => navigation.navigate('ContractDetails', { contractId: contract.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{contract.title || 'Contract'}</Text>
          <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.cardMeta}>Created: {formatDate(contract.createdAt)}</Text>
        <Text style={styles.viewDetails}>View Details →</Text>
      </TouchableOpacity>
    );
  };

  const isHomeowner = (user?.role || '').toLowerCase() === 'homeowner';
  const isContractor = (user?.role || '').toLowerCase() === 'contractor';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Contracts</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <Text style={styles.muted}>Loading contracts...</Text>}
        {!isLoading && approvedGenerated.length === 0 && (
          <Text style={styles.muted}>No signed contracts yet.</Text>
        )}
        {!isLoading &&
          approvedGenerated.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate('ProjectOverview', {
                  project: { id: c.projectId },
                  role: isContractor ? 'contractor' : 'homeowner',
                  openContractId: c.id,
                })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{c.description || 'Contract'}</Text>
                <View style={[styles.badge, { backgroundColor: statusStyles.signed.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: statusStyles.signed.color }]}>Approved</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>Project: {c.projectId}</Text>
              <Text style={styles.cardMeta}>
                Total: {c.currency} {Number(c.totalBudget || 0).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    shadowColor: '#1E293B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: palette.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: { padding: 20, gap: 14 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  primaryButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 14,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: palette.text },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { fontWeight: '700', letterSpacing: 0.2 },
  cardMeta: { color: palette.muted, marginTop: 6, fontSize: 13 },
  viewDetails: { color: palette.primary, marginTop: 10, fontWeight: '700' },
  muted: { color: palette.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: palette.text, marginBottom: 12 },
  label: { color: palette.text, marginTop: 10, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    color: palette.text,
    backgroundColor: '#F8FAFF',
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cancelText: { color: palette.text },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: palette.primary,
    shadowColor: '#1E293B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  submitText: { color: '#fff', fontWeight: '700' },
});

export default ContractsScreen;
