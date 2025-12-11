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
        <View style={styles.header}>
          <Text style={styles.title}>{contract.title || 'Contract'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{(contract.status || 'pending').toUpperCase()}</Text>
          </View>
        </View>
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
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: palette.text, flex: 1 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  badgeText: { color: palette.primary, fontWeight: '700', fontSize: 12 },
  meta: { color: palette.muted, fontSize: 13.5 },
  link: { color: palette.primary, fontWeight: '700', marginTop: 4 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: { fontWeight: '800', marginBottom: 10, color: palette.text, fontSize: 18 },
  body: { color: palette.text, lineHeight: 22, fontSize: 15 },
  muted: { color: palette.muted },
});

export default ContractViewScreen;
