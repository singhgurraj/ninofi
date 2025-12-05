import React, { useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Signature from 'react-native-signature-canvas';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { signContract } from '../../services/contracts';

const ContractSignatureScreen = ({ route, navigation }) => {
  const { contract } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const sigRef = useRef(null);
  const [signing, setSigning] = useState(false);

  if (!contract) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Contract not found.</Text>
      </SafeAreaView>
    );
  }

  const handleOK = async (signatureData) => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please log in.');
      return;
    }
    setSigning(true);
    const res = await signContract({
      contractId: contract.id,
      userId: user.id,
      signatureData,
    });
    setSigning(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Could not save signature.');
      return;
    }
    Alert.alert('Signed', 'Signature saved.', [
      { text: 'Done', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sign Contract</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{contract.title || 'Contract'}</Text>
        <Text style={styles.meta}>Status: {contract.status}</Text>
      </View>

      <View style={styles.signatureBox}>
        <Signature
          ref={sigRef}
          onOK={handleOK}
          onEmpty={() => Alert.alert('Signature required')}
          webStyle={'.m-signature-pad--footer {display:none;}'}
          descriptionText=""
          clearText="Clear"
          confirmText="Save"
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={() => sigRef.current?.clear()}>
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={() => sigRef.current?.readSignature()}
          disabled={signing}
        >
          <Text style={styles.primaryText}>{signing ? 'Saving…' : 'Submit Signature'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background, padding: 16, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: palette.text, fontSize: 22 },
  title: { fontSize: 18, fontWeight: '700', color: palette.text },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 4,
  },
  cardTitle: { fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  buttonText: { color: palette.text, fontWeight: '600' },
  primary: { backgroundColor: palette.primary, borderColor: palette.primary },
  primaryText: { color: '#fff', fontWeight: '700' },
  muted: { color: palette.muted },
});

export default ContractSignatureScreen;
