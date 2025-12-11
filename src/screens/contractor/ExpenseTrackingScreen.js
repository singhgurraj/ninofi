import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { expenseAPI } from '../../services/expenses';
import palette from '../../styles/palette';

const categoryOptions = [
  { label: 'Materials', value: 'materials' },
  { label: 'Gas', value: 'gas' },
  { label: 'Tools', value: 'tools' },
  { label: 'Other', value: 'other' },
];

const initialFormState = {
  category: 'materials',
  amount: '',
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

const ExpenseTrackingScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = useCallback(
    async (opts = { refreshing: false }) => {
      if (!user?.id) return;
      if (opts.refreshing) setRefreshing(true);
      else setIsLoading(true);
      try {
        const res = await expenseAPI.getContractorExpenses(user.id);
        setExpenses(res.data || []);
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load expenses');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleRefresh = useCallback(() => {
    fetchExpenses({ refreshing: true });
  }, [fetchExpenses]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => setFormData(initialFormState);

  const handleLogExpense = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!formData.amount || Number.isNaN(Number(formData.amount))) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
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
      await expenseAPI.logExpense({
        contractorId: user.id,
        projectId: formData.projectId,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
      });
      Alert.alert('Success', 'Expense logged successfully.');
      setModalVisible(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to log expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (expenseId) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseAPI.deleteExpense(expenseId);
            fetchExpenses();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  const renderExpenseCard = (expense) => (
    <View key={expense.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{expense.category || 'Expense'}</Text>
        <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
      </View>
      {expense.description ? <Text style={styles.cardMeta}>{expense.description}</Text> : null}
      <Text style={styles.cardMeta}>Date: {formatDate(expense.date)}</Text>
      {expense.projectTitle || expense.projectId ? (
        <Text style={styles.cardMeta}>Project: {expense.projectTitle || expense.projectId}</Text>
      ) : null}
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(expense.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Expenses</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.primaryButtonText}>Log Expense</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
        </View>

        {isLoading && <Text style={styles.muted}>Loading expenses...</Text>}
        {!isLoading && expenses.length === 0 && <Text style={styles.muted}>No expenses logged yet.</Text>}
        {!isLoading && expenses.map(renderExpenseCard)}
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              style={styles.modalKeyboardContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Log Expense</Text>

                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryRow}>
                  {categoryOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.categoryPill,
                        formData.category === option.value && styles.categoryPillActive,
                      ]}
                      onPress={() => updateField('category', option.value)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          formData.category === option.value && styles.categoryTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={formData.amount}
                  onChangeText={(text) => updateField('amount', text)}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                  selectionColor={palette.primary}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => updateField('description', text)}
                  placeholder="What was this expense for?"
                  multiline
                  selectionColor={palette.primary}
                />

                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.date}
                  onChangeText={(text) => updateField('date', text)}
                  placeholder="YYYY-MM-DD"
                  selectionColor={palette.primary}
                />

                <Text style={styles.label}>Project ID</Text>
                <TextInput
                  style={styles.input}
                  value={formData.projectId}
                  onChangeText={(text) => updateField('projectId', text)}
                  placeholder="Enter project ID"
                  autoCapitalize="none"
                  selectionColor={palette.primary}
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
                  <TouchableOpacity style={styles.submitButton} onPress={handleLogExpense} disabled={isSubmitting}>
                    <Text style={styles.submitText}>{isSubmitting ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: palette.text },
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
  summaryValue: { fontSize: 26, fontWeight: '700', color: palette.text, marginTop: 6 },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  amount: { fontSize: 18, fontWeight: '700', color: palette.primary },
  cardMeta: { color: palette.muted, marginTop: 4 },
  deleteButton: { marginTop: 10 },
  deleteText: { color: '#DC2626', fontWeight: '600' },
  muted: { color: palette.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalKeyboardContainer: { flex: 1 },
  modalScrollContent: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 20,
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
    borderRadius: 10,
    padding: 12,
    color: palette.text,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  categoryText: { color: palette.text },
  categoryTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
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

export default ExpenseTrackingScreen;
