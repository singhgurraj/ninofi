import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { applyToProject } from '../../services/projects';
import palette from '../../styles/palette';

const ContractorProjectDetailsScreen = ({ route, navigation }) => {
  const { project } = route.params || {};
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { appliedProjectIds } = useSelector((state) => state.projects);
  const [isApplying, setIsApplying] = useState(false);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Project not found.</Text>
      </SafeAreaView>
    );
  }

  const handleApply = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please log in as a contractor.');
      return;
    }
    setIsApplying(true);
    const result = await dispatch(applyToProject(project.id, user.id));
    setIsApplying(false);
    if (result?.success) {
      Alert.alert('Applied', 'Your application was sent.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', result?.error || 'Failed to apply.');
    }
  };

  const applied = appliedProjectIds.includes(project.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.meta}>{project.projectType || 'Project'}</Text>
        <Text style={styles.meta}>Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}</Text>
        <Text style={styles.meta}>{project.timeline || 'No timeline provided'}</Text>
        <Text style={styles.meta}>{project.address || 'No address provided'}</Text>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{project.description || 'No description provided.'}</Text>

        <Text style={styles.sectionTitle}>Milestones</Text>
        {project.milestones?.length ? (
          project.milestones.map((m, idx) => (
            <View key={m.id || idx} style={styles.milestone}>
              <Text style={styles.milestoneTitle}>{m.name}</Text>
              <Text style={styles.milestoneMeta}>
                ${Number(m.amount || 0).toLocaleString()} • {m.description || 'No description'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No milestones.</Text>
        )}

        <Text style={styles.sectionTitle}>Images</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
          {project.media?.length ? (
            project.media.map((m, idx) => (
              <Image
                key={m.id || idx}
                source={{ uri: m.url }}
                style={styles.media}
              />
            ))
          ) : (
            <Text style={styles.muted}>No images attached.</Text>
          )}
        </ScrollView>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.applyButton, applied || isApplying ? styles.applyDisabled : null]}
          onPress={handleApply}
          disabled={applied || isApplying}
        >
          <Text style={styles.applyText}>
            {applied ? 'Already Applied' : isApplying ? 'Applying…' : 'Apply for Job'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  sectionTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: palette.text },
  body: { color: palette.text, marginTop: 6, lineHeight: 20 },
  milestone: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  milestoneTitle: { fontWeight: '700', color: palette.text },
  milestoneMeta: { color: palette.muted, marginTop: 2 },
  mediaRow: { marginTop: 8 },
  media: { width: 140, height: 140, borderRadius: 12, marginRight: 10, backgroundColor: '#eee' },
  muted: { color: palette.muted },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  applyButton: {
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyDisabled: { backgroundColor: '#A5B4FC' },
  applyText: { color: '#fff', fontWeight: '700' },
});

export default ContractorProjectDetailsScreen;
