import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { submitReview } from '../../services/reviews';

const ReviewFormScreen = ({ route, navigation }) => {
  const { contractorId, projectId } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    ratingOverall: 5,
    ratingQuality: 5,
    ratingTimeliness: 5,
    ratingCommunication: 5,
    ratingBudget: 5,
    comment: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please log in.');
      return;
    }
    setSaving(true);
    const res = await submitReview({
      contractorId,
      projectId,
      reviewerId: user.id,
      ...form,
    });
    setSaving(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Unable to submit review');
      return;
    }
    Alert.alert('Thank you', 'Review submitted for moderation.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const ratingFields = [
    ['ratingOverall', 'Overall'],
    ['ratingQuality', 'Quality'],
    ['ratingTimeliness', 'Timeliness'],
    ['ratingCommunication', 'Communication'],
    ['ratingBudget', 'Budget adherence'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Leave a review</Text>
        {ratingFields.map(([key, label]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.ratingInput}
              keyboardType="numeric"
              value={String(form[key])}
              onChangeText={(val) =>
                setForm((s) => ({ ...s, [key]: Math.max(1, Math.min(5, Number(val) || 0)) }))
              }
            />
          </View>
        ))}
        <Text style={styles.label}>Feedback</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="What went well? What could improve?"
          placeholderTextColor={palette.muted}
          value={form.comment}
          onChangeText={(comment) => setForm((s) => ({ ...s, comment }))}
        />

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.primaryText}>{saving ? 'Submitting…' : 'Submit review'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: palette.text, fontWeight: '600' },
  ratingInput: {
    width: 60,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: 8,
    color: palette.text,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    color: palette.text,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});

export default ReviewFormScreen;
