import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { walletAPI } from '../../services/api';
import palette from '../../styles/palette';

const WalletScreen = ({ navigation }) => {
  const { user, role } = useSelector((state) => state.auth);
  const [selectedTab, setSelectedTab] = useState('all');
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingFunds, setAddingFunds] = useState(false);
  const isStripeConnected =
    !!((user?.stripeAccountId || user?.stripe_account_id) &&
    (user?.stripePayoutsEnabled || user?.stripe_payouts_enabled) &&
    (user?.stripeChargesEnabled || user?.stripe_charges_enabled));

  const formatCurrency = (amount = 0) =>
    `$${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await walletAPI.getBalance();
      const data = res.data || {};
      setAvailable(Number(data.available || 0));
      setPending(Number(data.pending || 0));
    } catch (_err) {
      setError('Could not load wallet balance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const transactions = [];

  const filteredTransactions = transactions.filter(t => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'income') return t.type === 'credit';
    if (selectedTab === 'expenses') return t.type === 'debit';
    return true;
  });

  const handleWithdraw = () => {
    if (available === 0) {
      Alert.alert('No Balance', 'You have no available balance to withdraw');
      return;
    }
    Alert.alert(
      'Withdraw Funds',
      'Choose withdrawal method:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Bank Transfer (2-3 days)', onPress: () => Alert.alert('Success', 'Withdrawal initiated!') },
        { text: 'Instant Transfer ($2.50 fee)', onPress: () => Alert.alert('Success', 'Withdrawal initiated!') },
      ]
    );
  };

  const handleAddFunds = useCallback(async () => {
    setAddingFunds(true);
    setError(null);
    try {
      await walletAPI.addDemoFunds();
      await loadBalance();
      Alert.alert('Success', 'Added $13 test funds.');
    } catch (_err) {
      setError('Could not add demo funds.');
    } finally {
      setAddingFunds(false);
    }
  }, [loadBalance]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadBalance}
            disabled={loading}
          >
            <Text style={styles.refreshText}>{loading ? 'Loading...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {loading ? 'Loading...' : formatCurrency(available)}
          </Text>
          
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Available</Text>
              <Text style={styles.balanceItemValue}>{formatCurrency(available)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Pending</Text>
              <Text style={styles.balanceItemValue}>{formatCurrency(pending)}</Text>
            </View>
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={handleWithdraw}
            >
              <Text style={styles.withdrawIcon}>↓</Text>
              <Text
                style={styles.withdrawText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Withdraw
              </Text>
            </TouchableOpacity>
            {__DEV__ ? (
              <TouchableOpacity 
                style={[
                  styles.analyticsButton,
                  addingFunds && styles.disabledButton,
                ]}
                onPress={handleAddFunds}
                disabled={addingFunds}
              >
                {addingFunds ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.analyticsIcon}>💵</Text>
                )}
                <Text
                  style={styles.analyticsText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {addingFunds ? 'Adding...' : 'Add $13 Test Funds'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.analyticsButton}
                onPress={() => Alert.alert('Analytics', 'Detailed analytics coming soon')}
              >
                <Text style={styles.analyticsIcon}>📊</Text>
                <Text
                  style={styles.analyticsText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Analytics
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => Alert.alert('Bank Account', 'Manage bank accounts - Coming soon')}
          >
            <Text style={styles.quickActionIcon}>🏦</Text>
            <Text
              style={styles.quickActionLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Bank Account
            </Text>
            <Text style={styles.quickActionDesc}>2-3 business days</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => Alert.alert('Instant Transfer', 'Instant transfer - Coming soon')}
          >
            <Text style={styles.quickActionIcon}>⚡</Text>
            <Text
              style={styles.quickActionLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Instant Transfer
            </Text>
            <Text style={styles.quickActionDesc}>$2.50 fee</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => Alert.alert('Tax Documents', 'Tax documents - Coming soon')}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text
              style={styles.quickActionLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Tax Documents
            </Text>
            <Text style={styles.quickActionDesc}>1099s & receipts</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
              onPress={() => setSelectedTab('all')}
            >
              <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, selectedTab === 'income' && styles.tabActive]}
              onPress={() => setSelectedTab('income')}
            >
              <Text style={[styles.tabText, selectedTab === 'income' && styles.tabTextActive]}>
                Income
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, selectedTab === 'expenses' && styles.tabActive]}
              onPress={() => setSelectedTab('expenses')}
            >
              <Text style={[styles.tabText, selectedTab === 'expenses' && styles.tabTextActive]}>
                Expenses
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transaction List */}
          {filteredTransactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet.</Text>
          ) : (
            filteredTransactions.map((transaction) => (
              <TouchableOpacity 
                key={transaction.id}
                style={styles.transactionCard}
              >
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: transaction.type === 'credit' ? '#E8F5E9' : '#FFEBEE' }
                ]}>
                  <Text style={styles.transactionIconText}>
                    {transaction.type === 'credit' ? '↓' : '↑'}
                  </Text>
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{transaction.title}</Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                </View>
                
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'credit' ? '#4CAF50' : '#f44336' }
                  ]}>
                    {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toLocaleString()}
                  </Text>
                  {transaction.status === 'pending' && (
                    <Text style={styles.pendingBadge}>Pending</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* View All Link */}
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All Transactions</Text>
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
  balanceDetails: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  balanceItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
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
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
    textAlign: 'center',
    color: palette.text,
  },
  quickActionDesc: {
    fontSize: 11.5,
    color: palette.muted,
    textAlign: 'center',
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: palette.primary,
  },
  tabText: {
    fontSize: 14,
    color: palette.muted,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
  viewAllButton: {
    alignItems: 'center',
    padding: 18,
  },
  viewAllText: {
    fontSize: 14,
    color: palette.primary,
    fontWeight: '700',
  },
});

export default WalletScreen;
