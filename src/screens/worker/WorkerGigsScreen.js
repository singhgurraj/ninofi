import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';

const WorkerGigsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const { workerAssignments, workerProjects } = useSelector((state) => state.projects);
  const assignments = (workerAssignments || []).filter((a) => a.workerId === user?.id);
  const [apps, setApps] = useState([]);

  const loadApplications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await projectAPI.listGigApplications(user.id);
      setApps(res.data || []);
    } catch (err) {
      console.log('gigs:apps:error', err?.response?.data || err.message);
    }
  }, [user?.id]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications])
  );

  const projects = (workerProjects || []).filter((p) => p);
  const acceptedApps = apps.filter((a) => (a.status || '').toLowerCase() === 'accepted');
  const cards = [];
  const seen = new Set();
  projects.forEach((p) => {
    if (p?.id && !seen.has(p.id)) {
      cards.push({ id: p.id, title: p.title, description: p.description });
      seen.add(p.id);
    }
  });
  acceptedApps.forEach((a) => {
    const pid = a.project_id || a.projectId;
    if (pid && !seen.has(pid)) {
      cards.push({ id: pid, title: a.project_title || 'Project', description: a.message || '' });
      seen.add(pid);
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Gigs</Text>
        {cards.length === 0 && <Text style={styles.muted}>No gigs assigned yet.</Text>}
        {cards.map((proj) => (
          <TouchableOpacity
            key={proj.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('WorkerProject', {
                projectId: proj.id,
              })
            }
          >
            <Text style={styles.cardTitle}>{proj.title || 'Project'}</Text>
            <Text style={styles.cardMeta}>{proj.description || 'No description provided.'}</Text>
            <Text style={styles.cardMeta}>
              Assigned work: {assignments.filter((a) => a.projectId === proj.id).length}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  muted: { color: palette.muted },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 4,
  },
  cardTitle: { fontWeight: '700', color: palette.text },
  cardMeta: { color: palette.muted, fontSize: 12 },
});

export default WorkerGigsScreen;
