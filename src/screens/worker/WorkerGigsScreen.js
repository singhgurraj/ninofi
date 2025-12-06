import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';
import { removeWorkerProject } from '../../store/projectSlice';

const WorkerGigsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { workerAssignments, workerProjects } = useSelector((state) => state.projects);
  const assignments = (workerAssignments || []).filter((a) => a.workerId === user?.id);
  const [apps, setApps] = useState([]);

  const loadApplications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await projectAPI.listGigApplications(user.id);
      const fetched = res.data || [];
      const accepted = fetched.filter((a) => (a.status || '').toLowerCase() === 'accepted');
      const acceptedIds = Array.from(
        new Set(accepted.map((a) => a.project_id || a.projectId).filter(Boolean))
      );

      const invalid = new Set();
      await Promise.all(
        acceptedIds.map(async (pid) => {
          try {
            await projectAPI.getProjectDetails(pid);
          } catch (err) {
            const code = err?.response?.status;
            if (code === 404) {
              invalid.add(pid);
              dispatch(removeWorkerProject(pid));
            }
          }
        })
      );

      const filtered = invalid.size
        ? fetched.filter((a) => !invalid.has(a.project_id || a.projectId))
        : fetched;
      setApps(filtered);
    } catch (err) {
      console.log('gigs:apps:error', err?.response?.data || err.message);
    }
  }, [user?.id]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const acceptedApps = apps.filter((a) => (a.status || '').toLowerCase() === 'accepted');
  const acceptedIds = new Set(acceptedApps.map((a) => a.project_id || a.projectId).filter(Boolean));

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications])
  );

  const projects = (workerProjects || []).filter((p) => p && acceptedIds.has(p.id));
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

  const handleOpen = async (projId) => {
    try {
      await projectAPI.getProjectDetails(projId);
      navigation.navigate('WorkerProject', { projectId: projId });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        dispatch(removeWorkerProject(projId));
        setApps((prev) => prev.filter((a) => (a.project_id || a.projectId) !== projId));
        loadApplications();
        Alert.alert('Project removed', 'This project is no longer available.');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to open project');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Gigs</Text>
        {cards.length === 0 && <Text style={styles.muted}>No gigs assigned yet.</Text>}
        {cards.map((proj) => (
          <TouchableOpacity
            key={proj.id}
            style={styles.card}
            onPress={() => handleOpen(proj.id)}
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
