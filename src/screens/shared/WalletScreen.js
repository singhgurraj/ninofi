import { useCallback, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import palette from '../../styles/palette';
import { walletAPI } from '../../services/api';

const WalletScreen = ({ navigation }) => {
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingFunds, setAddingFunds] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const formatCurrency = (num = 0) =>
    `$${Number(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, txRes] = await Promise.all([
        walletAPI.getStatus(),
        walletAPI.getTransactions(),
      ]);
      const status = statusRes.data || {};
      setAvailable(Number(status.availableBalance || status.availableBalanceCents / 100 || 0));
      setTransactions(txRes.data?.transactions || []);
    } catch (_err) {
      setError('Could not load wallet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleWithdraw = () => {
    if (available === 0) {
      Alert.alert('No Balance', 'You have no available balance to withdraw');
      return;
    }
    Alert.alert('Withdraw Funds', 'Coming soon.');
  };

  const handleAddFunds = useCallback(async () => {
    setAddingFunds(true);
    setError(null);
    try {
      await walletAPI.addDemoFunds();
      await loadData();
      Alert.alert('Success', 'Added $13 test funds.');
    } catch (_err) {
      setError('Could not add demo funds.');
    } finally {
      setAddingFunds(false);
    }
  }, [loadData]);

  const handleSendPayment = useCallback(async () => {
    if (!recipientEmail || !amount) {
      Alert.alert('Missing info', 'Enter recipient email and amount.');
      return;
    }
    const amtNumber = Number(amount);
    if (!amtNumber || amtNumber <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount.');
      return;
    }
    setSending(true);
    try {
      const res = await walletAPI.sendPayment({
        recipientEmail,
        amountCents: Math.round(amtNumber * 100),
        description: note,
      });
      if (res.data?.paymentIntentClientSecret) {
        Alert.alert('Sent', 'Payment initiated in test mode.');
      }
      setSendModalVisible(false);
      setRecipientEmail('');
      setAmount('');
      setNote('');
      await loadData();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send payment');
    } finally {
      setSending(false);
    }
  }, [recipientEmail, amount, note, loadData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadData} disabled={loading}>
            <Text style={styles.refreshText}>{loading ? 'Loading…' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{loading ? 'Loading…' : formatCurrency(available)}</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
              <Text style={styles.withdrawIcon}>↓</Text>
              <Text style={styles.withdrawText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.analyticsButton, addingFunds && styles.disabledButton]}
              onPress={__DEV__ ? handleAddFunds : () => setSendModalVisible(true)}
              disabled={addingFunds}
            >
              {addingFunds ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.analyticsIcon}>{__DEV__ ? '💵' : '💸'}</Text>
              )}
              <Text style={styles.analyticsText}>
                {__DEV__ ? (addingFunds ? 'Adding…' : 'Add $13 Test Funds') : 'Send Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet.</Text>
          ) : (
            transactions.map((txn) => (
              <View key={txn.id} style={styles.transactionCard}>
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: txn.direction === 'in' ? '#E8F5E9' : '#FFEBEE' },
                  ]}
                >
                  <Text style={styles.transactionIconText}>{txn.direction === 'in' ? '↓' : '↑'}</Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {txn.description || (txn.direction === 'in' ? 'Payment received' : 'Payment sent')}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {txn.counterpartyName || txn.counterpartyEmail} • {txn.status}
                  </Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: txn.direction === 'in' ? '#4CAF50' : '#f44336' },
                    ]}
                  >
                    {txn.direction === 'in' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </Text>
                  {txn.status === 'PENDING' && <Text style={styles.pendingBadge}>Pending</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={sendModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Payment</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Recipient email"
              autoCapitalize="none"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Amount (USD)"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              placeholder="Note (optional)"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonGhost} onPress={() => setSendModalVisible(false)} disabled={sending}>
                <Text style={styles.modalButtonGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleSendPayment} disabled={sending}>
                <Text style={styles.modalButtonText}>{sending ? 'Sending…' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: palette.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    color: palette.text,
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshText: {
    color: palette.primary,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: palette.primary,
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  errorText: {
    color: '#FFE4E6',
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  withdrawIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  withdrawText: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.primary,
  },
  analyticsButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  analyticsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.7,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
    color: palette.text,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
    color: palette.text,
  },
  transactionDate: {
    fontSize: 12,
    color: palette.muted,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  pendingBadge: {
    fontSize: 11,
    color: palette.warning,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyText: {
    color: palette.muted,
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 13.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: palette.text },
  modalInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 10,
    color: palette.text,
    backgroundColor: '#f9fafb',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalButtonText: { color: '#fff', fontWeight: '800' },
  modalButtonGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalButtonGhostText: { color: palette.text, fontWeight: '700' },
});

export default WalletScreen;
