import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSelector } from 'react-redux';

const WalletScreen = ({ navigation }) => {
  const { role } = useSelector((state) => state.auth);
  const [selectedTab, setSelectedTab] = useState('all');

  const walletData = {
    balance: 0,
    pending: 0,
    thisMonth: 0,
  };

  const transactions = [];

  const filteredTransactions = transactions.filter(t => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'income') return t.type === 'credit';
    if (selectedTab === 'expenses') return t.type === 'debit';
    return true;
  });

  const handleWithdraw = () => {
    if (walletData.balance === 0) {
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
          <TouchableOpacity>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>${walletData.balance.toLocaleString()}</Text>
          
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Pending</Text>
              <Text style={styles.balanceItemValue}>${walletData.pending.toLocaleString()}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>This Month</Text>
              <Text style={styles.balanceItemValue}>${walletData.thisMonth.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={handleWithdraw}
            >
              <Text style={styles.withdrawIcon}>↓</Text>
              <Text style={styles.withdrawText}>Withdraw</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.analyticsButton}
              onPress={() => Alert.alert('Analytics', 'Detailed analytics coming soon')}
            >
              <Text style={styles.analyticsIcon}>📊</Text>
              <Text style={styles.analyticsText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => Alert.alert('Bank Account', 'Manage bank accounts - Coming soon')}
          >
            <Text style={styles.quickActionIcon}>🏦</Text>
            <Text style={styles.quickActionLabel}>Bank Account</Text>
            <Text style={styles.quickActionDesc}>2-3 business days</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => Alert.alert('Instant Transfer', 'Instant transfer - Coming soon')}
          >
            <Text style={styles.quickActionIcon}>⚡</Text>
            <Text style={styles.quickActionLabel}>Instant Transfer</Text>
            <Text style={styles.quickActionDesc}>$2.50 fee</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => Alert.alert('Tax Documents', 'Tax documents - Coming soon')}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionLabel}>Tax Documents</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  balanceCard: {
    backgroundColor: '#1976D2',
    margin: 20,
    padding: 25,
    borderRadius: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  withdrawText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  analyticsButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  analyticsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
    textAlign: 'center',
  },
  quickActionDesc: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1976D2',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
    fontWeight: '500',
    marginBottom: 3,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  pendingBadge: {
    fontSize: 10,
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 12,
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 20,
  },
  viewAllText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
});

export default WalletScreen;
