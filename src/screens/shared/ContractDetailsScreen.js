import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
import { contractAPI } from '../../services/contracts';

const statusStyles = {
  pending: { label: 'Pending', backgroundColor: '#FEF3C7', color: '#D97706' },
  signed: { label: 'Signed', backgroundColor: '#DCFCE7', color: '#16A34A' },
  rejected: { label: 'Rejected', backgroundColor: '#FEE2E2', color: '#DC2626' },
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const ContractDetailsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { contractId } = route.params || {};
  const { user } = useSelector((state) => state.auth);

  const [contract, setContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignModalVisible, setSignModalVisible] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadContract = async () => {
    if (!contractId) return;
    setIsLoading(true);
    try {
      const res = await contractAPI.getContractDetails(contractId);
      setContract(res.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load contract');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [contractId]);

  const handleSign = async () => {
    if (!user?.id || !signatureText.trim()) {
      Alert.alert('Required', 'Please enter your full name to sign.');
      return;
    }
    setIsSigning(true);
    try {
      await contractAPI.signContract(contractId, {
        userId: user.id,
        signatureData: signatureText.trim(),
      });
      Alert.alert('Success', 'Contract signed successfully.');
      setSignModalVisible(false);
      setSignatureText('');
      loadContract();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to sign contract');
    } finally {
      setIsSigning(false);
    }
  };

  const handleReject = () => {
    Alert.alert('Reject Contract', 'Are you sure you want to reject this contract?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          setIsUpdatingStatus(true);
          try {
            await contractAPI.updateContractStatus(contractId, {
              status: 'rejected',
              userId: user.id,
            });
            Alert.alert('Updated', 'Contract rejected.');
            loadContract();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update contract');
          } finally {
            setIsUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  if (isLoading || !contract) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading contract...</Text>
      </SafeAreaView>
    );
  }

  const status = contract.status || 'pending';
  const badge = statusStyles[status] || statusStyles.pending;
  const hasSigned = (contract.signatures || []).some((sig) => sig.userId === user?.id);
  const canSign = status === 'pending' && !hasSigned;
  const isOwner = contract.ownerId === user?.id || contract.createdBy === user?.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract Details</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{contract.title || 'Contract'}</Text>
            <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>Created: {formatDate(contract.createdAt)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Terms</Text>
          <Text style={styles.bodyText}>{contract.terms || 'No terms provided.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          {(contract.signatures || []).length === 0 && (
            <Text style={styles.muted}>No signatures yet.</Text>
          )}
          {(contract.signatures || []).map((signature) => (
            <View key={signature.id} style={styles.signatureRow}>
              <Text style={styles.signatureName}>{signature.user?.fullName || 'User'}</Text>
              <Text style={styles.signatureMeta}>
                Signed on {formatDate(signature.signedAt)}
              </Text>
            </View>
          ))}
        </View>

        {canSign ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setSignModalVisible(true)}>
            <Text style={styles.primaryButtonText}>Sign Contract</Text>
          </TouchableOpacity>
        ) : null}

        {isOwner && status === 'pending' ? (
          <TouchableOpacity style={styles.dangerButton} onPress={handleReject} disabled={isUpdatingStatus}>
            <Text style={styles.dangerButtonText}>
              {isUpdatingStatus ? 'Updating...' : 'Reject Contract'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal visible={isSignModalVisible} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Contract</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={signatureText}
              onChangeText={setSignatureText}
              placeholder='Enter your full name'
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSignModalVisible(false);
                  setSignatureText('');
                }}
                disabled={isSigning}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSign}
                disabled={isSigning}
              >
                <Text style={styles.submitText}>{isSigning ? 'Signing...' : 'Sign'}</Text>
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
  backIcon: { fontSize: 24, color: palette.text },
  headerTitle: { fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, gap: 14 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
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
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontWeight: '600' },
  cardMeta: { color: palette.muted, marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: palette.text, marginBottom: 8 },
  bodyText: { color: palette.text, lineHeight: 20 },
  signatureRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  signatureName: { fontWeight: '600', color: palette.text },
  signatureMeta: { color: palette.muted, marginTop: 2 },
  muted: { color: palette.muted },
  primaryButton: {
    backgroundColor: palette.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1E293B',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dangerButtonText: { color: '#B91C1C', fontWeight: '600' },
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
  label: { color: palette.text, marginTop: 4, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    color: palette.text,
    backgroundColor: '#F8FAFF',
  },
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

export default ContractDetailsScreen;
