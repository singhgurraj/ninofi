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

const FundProjectScreen = ({ route, navigation }) => {
  const { project } = route.params || {
    project: {
      title: 'Kitchen Renovation',
      budget: 12500,
      milestones: [
        { name: 'Demo & Prep Work', amount: 2500 },
        { name: 'Plumbing Installation', amount: 3000 },
        { name: 'Electrical Work', amount: 2000 },
        { name: 'Cabinet Installation', amount: 3500 },
        { name: 'Final Touches', amount: 1500 },
      ],
    }
  };

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const escrowFee = parseFloat(project.budget) * 0.01; // 1% platform fee
  const totalAmount = parseFloat(project.budget) + escrowFee;

  const paymentMethods = [
    { id: 'bank', label: 'Bank Transfer', icon: '🏦', fee: 0, time: '2-3 business days' },
    { id: 'card', label: 'Credit/Debit Card', icon: '💳', fee: 2.9, time: 'Instant' },
    { id: 'apple', label: 'Apple Pay', icon: '🍎', fee: 2.9, time: 'Instant' },
    { id: 'google', label: 'Google Pay', icon: 'G', fee: 2.9, time: 'Instant' },
  ];

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
  const processingFee = selectedMethod ? (parseFloat(project.budget) * selectedMethod.fee / 100) : 0;
  const finalTotal = totalAmount + processingFee;

  const handleFundProject = () => {
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions');
      return;
    }
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method', 'Please select a payment method');
      return;
    }

    Alert.alert(
      'Fund Project',
      `Deposit $${finalTotal.toFixed(2)} to escrow?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', 'Project funded successfully!', [
              { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
          }
        }
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
          <Text style={styles.headerTitle}>Fund Project</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Project Info */}
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🛡️</Text>
          </View>
          <Text style={styles.title}>{project.title}</Text>
          <Text style={styles.subtitle}>Fund Your Project Securely</Text>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Project Budget</Text>
            <Text style={styles.amountValue}>${project.budget}</Text>
          </View>

          <View style={styles.protectionBanner}>
            <Text style={styles.protectionIcon}>🔒</Text>
            <View style={styles.protectionText}>
              <Text style={styles.protectionTitle}>100% Protected by Escrow</Text>
              <Text style={styles.protectionDesc}>
                Funds held securely and only released when you approve completed milestones
              </Text>
            </View>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestone Breakdown</Text>
          {project.milestones?.map((milestone, index) => (
            <View key={index} style={styles.milestoneItem}>
              <Text style={styles.milestoneIcon}>○</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneName}>{milestone.name}</Text>
              </View>
              <Text style={styles.milestoneAmount}>${milestone.amount}</Text>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === method.id && styles.paymentMethodActive
              ]}
              onPress={() => setSelectedPaymentMethod(method.id)}
            >
              <Text style={styles.paymentIcon}>{method.icon}</Text>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>{method.label}</Text>
                <Text style={styles.paymentTime}>{method.time}</Text>
              </View>
              {method.fee > 0 && (
                <Text style={styles.paymentFee}>+{method.fee}%</Text>
              )}
              {selectedPaymentMethod === method.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Fee Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Project Amount</Text>
              <Text style={styles.feeValue}>${project.budget}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Platform Fee (1%)</Text>
              <Text style={styles.feeValue}>${escrowFee.toFixed(2)}</Text>
            </View>
            {processingFee > 0 && (
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Payment Processing</Text>
                <Text style={styles.feeValue}>${processingFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.feeRow}>
              <Text style={styles.totalLabel}>Total to Deposit</Text>
              <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the Terms of Service and Escrow Agreement
            </Text>
          </TouchableOpacity>
          <Text style={styles.termsNote}>
            Funds will only be released upon your approval of completed milestones
          </Text>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>Secured by 256-bit SSL encryption</Text>
        </View>

        {/* Fund Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.fundButton,
              (!acceptedTerms || !selectedPaymentMethod) && styles.fundButtonDisabled
            ]}
            onPress={handleFundProject}
            disabled={!acceptedTerms || !selectedPaymentMethod}
          >
            <Text style={styles.fundButtonText}>
              Deposit ${finalTotal.toFixed(2)} to Escrow
            </Text>
          </TouchableOpacity>
        </View>
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
  },
  placeholder: {
    width: 40,
  },
  section: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  amountContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  protectionBanner: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
  },
  protectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  protectionText: {
    flex: 1,
  },
  protectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#2E7D32',
  },
  protectionDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  milestoneIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#1976D2',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 16,
    color: '#333',
  },
  milestoneAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  paymentMethodActive: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  paymentTime: {
    fontSize: 12,
    color: '#666',
  },
  paymentFee: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  checkmark: {
    fontSize: 20,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 16,
    color: '#666',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  termsNote: {
    fontSize: 12,
    color: '#666',
    marginLeft: 34,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  fundButton: {
    backgroundColor: '#1976D2',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  fundButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  fundButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default FundProjectScreen;