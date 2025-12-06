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
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { expenseAPI } from '../../services/expenses';

const initialFormState = {
  hours: '',
  hourlyRate: '',
  description: '',
  date: '',
  projectId: '',
};

const formatCurrency = (value) => `$${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const PayrollTrackingScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEntries = useCallback(
    async (opts = { refreshing: false }) => {
      if (!user?.id) return;
      if (opts.refreshing) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const res = await expenseAPI.getContractorWorkHours(user.id);
        setEntries(res.data || []);
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load work hours');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRefresh = useCallback(() => {
    fetchEntries({ refreshing: true });
  }, [fetchEntries]);

  const totalHours = entries.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  const totalEarnings = entries.reduce(
    (sum, item) => sum + (Number(item.hours) || 0) * (Number(item.hourlyRate) || 0),
    0
  );

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const handleLogHours = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!formData.hours || Number.isNaN(Number(formData.hours))) {
      Alert.alert('Invalid hours', 'Please enter a valid number of hours.');
      return;
    }
    if (formData.hourlyRate && Number.isNaN(Number(formData.hourlyRate))) {
      Alert.alert('Invalid rate', 'Please enter a valid hourly rate.');
      return;
    }
    if (!formData.date) {
      Alert.alert('Required', 'Please provide a date.');
      return;
    }
    if (!formData.projectId) {
      Alert.alert('Required', 'Please enter a project ID.');
      return;
    }
    setIsSubmitting(true);
    try {
      await expenseAPI.logWorkHours({
        contractorId: user.id,
        projectId: formData.projectId,
        hours: parseFloat(formData.hours),
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : 0,
        description: formData.description,
        date: formData.date,
      });
      Alert.alert('Success', 'Work hours logged successfully.');
      setModalVisible(false);
      resetForm();
      fetchEntries();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to log work hours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (entryId) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseAPI.deleteWorkHours(entryId);
            fetchEntries();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  const renderEntryCard = (entry) => {
    const hours = Number(entry.hours) || 0;
    const rate = Number(entry.hourlyRate) || 0;
    const total = hours * rate;
    return (
      <View key={entry.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{`${hours} ${hours === 1 ? 'hour' : 'hours'}`}</Text>
          <Text style={styles.amount}>{formatCurrency(total)}</Text>
        </View>
        <Text style={styles.cardMeta}>Rate: {formatCurrency(rate)}/hr</Text>
        {entry.description ? <Text style={styles.cardMeta}>{entry.description}</Text> : null}
        <Text style={styles.cardMeta}>Date: {formatDate(entry.date)}</Text>
        {entry.projectTitle || entry.projectId ? (
          <Text style={styles.cardMeta}>
            Project: {entry.projectTitle || entry.projectId}
          </Text>
        ) : null}
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(entry.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Hours</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Work Hours</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.primaryButtonText}>Log Hours</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Hours</Text>
          <Text style={styles.summaryValue}>{totalHours.toFixed(2)}</Text>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalEarnings)}</Text>
        </View>

        {isLoading && <Text style={styles.muted}>Loading work hours...</Text>}
        {!isLoading && entries.length === 0 && (
          <Text style={styles.muted}>No work hours logged yet.</Text>
        )}
        {!isLoading && entries.map(renderEntryCard)}
      </ScrollView>

      <Modal visible={isModalVisible} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Work Hours</Text>

            <Text style={styles.label}>Hours</Text>
            <TextInput
              style={styles.input}
              value={formData.hours}
              onChangeText={(text) => updateField('hours', text)}
              placeholder='Enter hours'
              keyboardType='decimal-pad'
            />

            <Text style={styles.label}>Hourly Rate</Text>
            <TextInput
              style={styles.input}
              value={formData.hourlyRate}
              onChangeText={(text) => updateField('hourlyRate', text)}
              placeholder='Enter hourly rate'
              keyboardType='decimal-pad'
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => updateField('description', text)}
              placeholder='What work was done?'
              multiline
            />

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(text) => updateField('date', text)}
              placeholder='YYYY-MM-DD'
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
                onPress={handleLogHours}
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
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#1E293B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  summaryLabel: { color: palette.muted, fontSize: 13 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: palette.text, marginTop: 6 },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 12,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
    shadowColor: '#1E293B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  amount: { fontSize: 18, fontWeight: '700', color: palette.primary },
  cardMeta: { color: palette.muted, marginTop: 4 },
  deleteButton: { marginTop: 10 },
  deleteText: { color: '#DC2626', fontWeight: '600' },
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
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
    backgroundColor: '#F8FAFC',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
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

export default PayrollTrackingScreen;
