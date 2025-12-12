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
import { applyToProject, leaveProject } from '../../services/projects';
import palette from '../../styles/palette';

const ContractorProjectDetailsScreen = ({ route, navigation }) => {
  const { project, canApply = true, canLeave = false } = route.params || {};
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { appliedProjectIds } = useSelector((state) => state.projects);
  const [isApplying, setIsApplying] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const canChat =
    project?.assignedContractor?.id &&
    project?.owner?.id &&
    user?.id &&
    project.assignedContractor.id === user.id;
  const canLeaveProject = !!canLeave;

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

  const mediaList = Array.isArray(project.media)
    ? project.media.filter((m, idx, arr) => {
        const key = (m.id || m.url || '').toString();
        if (!key) return true;
        const firstIndex = arr.findIndex((x) => (x.id || x.url || '').toString() === key);
        return firstIndex === idx;
      })
    : [];

  const handleLeave = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please log in as a contractor.');
      return;
    }
    Alert.alert(
      'Leave Project',
      'Are you sure you want to leave this project? The homeowner will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            const result = await leaveProject(project.id, { contractorId: user.id }, dispatch);
            setIsLeaving(false);
            if (result.success) {
              Alert.alert('Left project', 'The homeowner has been notified.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to leave project.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{project.title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{project.projectType || 'Project'}</Text>
            </View>
          </View>
          <Text style={styles.meta}>Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}</Text>
          <Text style={styles.meta}>{project.timeline || 'No timeline provided'}</Text>
          <Text style={styles.meta}>{project.address || 'No address provided'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.body}>{project.description || 'No description provided.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Media</Text>
          {mediaList.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {mediaList.map((m, idx) => (
                <Image
                  key={`${m.id || 'media'}-${idx}-${m.url || 'uri'}`}
                  source={{ uri: m.url }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>No media added.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {project.milestones?.length ? (
            project.milestones.map((m, idx) => (
              <View key={m.id || idx} style={styles.milestone}>
                <View>
                  <Text style={styles.milestoneTitle}>{m.name}</Text>
                  <Text style={styles.milestoneMeta}>
                    ${Number(m.amount || 0).toLocaleString()} • {m.description || 'No description'}
                  </Text>
                </View>
                <View style={styles.milestonePill}>
                  <Text style={styles.milestonePillText}>{m.status || 'Pending'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No milestones.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
            {mediaList.length ? (
              mediaList.map((m, idx) => (
                <Image
                  key={`${m.id || 'media'}-${idx}-${m.url || 'uri'}`}
                  source={{ uri: m.url }}
                  style={styles.media}
                />
              ))
            ) : (
              <Text style={styles.muted}>No images attached.</Text>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {(canApply || canLeaveProject) && (
        <View style={styles.footer}>
          {canChat && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', { project })}
            >
              <Text style={styles.chatText}>Message Homeowner</Text>
            </TouchableOpacity>
          )}
          {canApply && (
            <TouchableOpacity
              style={[styles.applyButton, applied || isApplying ? styles.applyDisabled : null]}
              onPress={handleApply}
              disabled={applied || isApplying}
            >
              <Text style={styles.applyText}>
                {applied ? 'Already Applied' : isApplying ? 'Applying…' : 'Apply for Job'}
              </Text>
            </TouchableOpacity>
          )}
          {canLeaveProject && (
            <TouchableOpacity
              style={[styles.leaveButton, isLeaving ? styles.leaveDisabled : null]}
              onPress={handleLeave}
              disabled={isLeaving}
            >
              <Text style={styles.leaveText}>{isLeaving ? 'Leaving…' : 'Leave Project'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    alignItems: 'center',
  },
  backIcon: { fontSize: 24, color: palette.text },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center', color: palette.text },
  headerSpacer: { width: 40 },
  content: { padding: 20, gap: 14 },
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
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: palette.text, flex: 1 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  badgeText: { color: palette.primary, fontWeight: '700', letterSpacing: 0.2 },
  meta: { color: palette.muted, fontSize: 13.5 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: palette.text, marginBottom: 8 },
  body: { color: palette.text, marginTop: 4, lineHeight: 22, fontSize: 15 },
  milestone: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  milestoneTitle: { fontWeight: '800', color: palette.text, fontSize: 15 },
  milestoneMeta: { color: palette.muted, marginTop: 2, fontSize: 13.5 },
  milestonePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '75%',
    flexShrink: 1,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  milestonePillText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 12.5,
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  mediaRow: { marginTop: 10, gap: 10 },
  media: {
    width: 140,
    height: 140,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: palette.border,
  },
  muted: { color: palette.muted },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
    gap: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  chatButton: {
    backgroundColor: '#E8EAFF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chatText: { color: palette.primary, fontWeight: '800' },
  applyButton: {
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  applyDisabled: { backgroundColor: '#A5B4FC' },
  applyText: { color: '#fff', fontWeight: '800' },
  leaveButton: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  leaveText: { color: '#B91C1C', fontWeight: '800' },
  leaveDisabled: { opacity: 0.7 },
  mediaRow: { flexDirection: 'row', gap: 10 },
});

export default ContractorProjectDetailsScreen;
