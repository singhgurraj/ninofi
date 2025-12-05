import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import palette from '../../styles/palette';

const ContractViewScreen = ({ route }) => {
  const { contract } = route.params || {};

  const mockTerms = `Scope of Work:\n- Deliver agreed services per milestones\n- Provide updates weekly\n\nPayment\n- Funds released after milestone approval\n- Disputes handled per platform policy\n\nSignatures\n- Homeowner and Contractor must sign to activate.`;

  if (!contract) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Contract</Text>
          <Text style={styles.muted}>No contract data provided.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{contract.title || 'Contract'}</Text>
        <Text style={styles.meta}>Status: {(contract.status || 'pending').toUpperCase()}</Text>
        {typeof contract.signatureCount === 'number' ? (
          <Text style={styles.meta}>Signatures: {contract.signatureCount}</Text>
        ) : null}
        {contract.pdfUrl ? (
          <Text style={styles.link}>Attached PDF: {contract.pdfUrl}</Text>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Terms & Conditions</Text>
          <Text style={styles.body}>{contract.terms || mockTerms}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  link: { color: palette.primary, fontWeight: '600' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: { fontWeight: '700', marginBottom: 8, color: palette.text },
  body: { color: palette.text, lineHeight: 20 },
  muted: { color: palette.muted },
});

export default ContractViewScreen;
