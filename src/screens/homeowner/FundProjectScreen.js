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
import palette from '../../styles/palette';

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
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
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
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 5,
    color: palette.text,
  },
  subtitle: {
    fontSize: 16,
    color: palette.muted,
    textAlign: 'center',
  },
  amountCard: {
    backgroundColor: palette.surface,
    margin: 20,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  amountContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.primary,
  },
  protectionBanner: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
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
    fontWeight: '800',
    marginBottom: 5,
    color: palette.primary,
  },
  protectionDesc: {
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
    color: palette.text,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  milestoneIcon: {
    fontSize: 20,
    marginRight: 12,
    color: palette.primary,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 16,
    color: palette.text,
  },
  milestoneAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: palette.surface,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  paymentMethodActive: {
    borderColor: palette.primary,
    backgroundColor: '#EEF2FF',
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
    fontWeight: '700',
    marginBottom: 3,
    color: palette.text,
  },
  paymentTime: {
    fontSize: 12,
    color: palette.muted,
  },
  paymentFee: {
    fontSize: 14,
    color: palette.muted,
    marginRight: 10,
  },
  checkmark: {
    fontSize: 20,
    color: palette.primary,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 16,
    color: palette.muted,
  },
  feeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.primary,
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
    borderColor: palette.border,
    borderRadius: 6,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: palette.text,
    lineHeight: 20,
  },
  termsNote: {
    fontSize: 12,
    color: palette.muted,
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
    color: palette.muted,
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  fundButton: {
    backgroundColor: palette.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  fundButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  fundButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

export default FundProjectScreen;
