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
import { contractAPI } from '../../services/contracts';

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
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchContracts = useCallback(
    async (opts = { refreshing: false }) => {
      if (!user?.id) return;
      if (opts.refreshing) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const res = await contractAPI.getUserContracts(user.id);
        setContracts(res.data || []);
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load contracts');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleRefresh = useCallback(() => {
    fetchContracts({ refreshing: true });
  }, [fetchContracts]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => setFormData(initialFormState);

  const handleCreateContract = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!formData.title.trim() || !formData.terms.trim() || !formData.projectId.trim()) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await contractAPI.createContract({
        title: formData.title.trim(),
        terms: formData.terms.trim(),
        projectId: formData.projectId.trim(),
        createdBy: user.id,
      });
      Alert.alert('Success', 'Contract created successfully.');
      setModalVisible(false);
      resetForm();
      fetchContracts();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contracts</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Contracts</Text>
          {isHomeowner ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.primaryButtonText}>Create Contract</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isLoading && <Text style={styles.muted}>Loading contracts...</Text>}
        {!isLoading && contracts.length === 0 && (
          <Text style={styles.muted}>No contracts yet.</Text>
        )}
        {!isLoading && contracts.map(renderContractCard)}
      </ScrollView>

      <Modal visible={isModalVisible} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Contract</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => updateField('title', text)}
              placeholder='Contract title'
            />

            <Text style={styles.label}>Terms</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.terms}
              onChangeText={(text) => updateField('terms', text)}
              placeholder='Enter contract terms...'
              multiline
            />

            <Text style={styles.label}>Project ID</Text>
            <TextInput
              style={styles.input}
              value={formData.projectId}
              onChangeText={(text) => updateField('projectId', text)}
              placeholder='Enter project ID'
              autoCapitalize='none'
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateContract}
                disabled={isSubmitting}
              >
                <Text style={styles.submitText}>{isSubmitting ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
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
  content: { padding: 20, gap: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  primaryButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontWeight: '600' },
  cardMeta: { color: palette.muted, marginTop: 6 },
  viewDetails: { color: palette.primary, marginTop: 8, fontWeight: '600' },
  muted: { color: palette.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: palette.text, marginBottom: 12 },
  label: { color: palette.text, marginTop: 10, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: 12,
    color: palette.text,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cancelText: { color: palette.text },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: palette.primary,
  },
  submitText: { color: '#fff', fontWeight: '600' },
});

export default ContractsScreen;
