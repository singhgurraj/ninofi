import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { createContractDraft } from '../../services/contracts';

const ContractWizardScreen = ({ route, navigation }) => {
  const { project } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const [title, setTitle] = useState(project ? `${project.title} - Contract` : 'Contract');
  const [terms, setTerms] = useState(
    project
      ? `Scope: ${project.title || ''}\nAmount: $${Number(project.estimatedBudget || 0).toLocaleString()}\nTimeline: ${project.timeline || 'TBD'}\n\nDeliverables:\n- Describe work\n\nPayment: Released after milestone approval.`
      : ''
  );
  const [loading, setLoading] = useState(false);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Project not found.</Text>
      </SafeAreaView>
    );
  }

  const handleCreate = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please log in.');
      return;
    }
    if (!title.trim() || !terms.trim()) {
      Alert.alert('Required', 'Add a title and terms.');
      return;
    }
    setLoading(true);
    const res = await createContractDraft({
      projectId: project.id,
      createdBy: user.id,
      title: title.trim(),
      terms: terms.trim(),
    });
    setLoading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to create contract');
      return;
    }
    Alert.alert('Draft created', 'Contract ready for signatures.', [
      {
        text: 'Sign now',
        onPress: () =>
          navigation.navigate('ContractSignature', {
            contract: res.data,
          }),
      },
      { text: 'OK' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Micro-Contract</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Kitchen remodel contract"
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.label}>Terms & Deliverables</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            value={terms}
            onChangeText={setTerms}
            placeholder="Describe scope, payments, timelines, deliverables"
            placeholderTextColor={palette.muted}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.primaryText}>{loading ? 'Creating…' : 'Create Contract'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  label: { color: palette.text, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    color: palette.text,
  },
  multiline: { minHeight: 160, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  muted: { color: palette.muted, padding: 20 },
  disabled: { opacity: 0.6 },
});

export default ContractWizardScreen;
