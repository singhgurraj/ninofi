import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
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

  const handleSubmitWork = async (proj) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to submit work.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.7 });
      if (result.canceled || !result.assets?.length) return;
      const uri = result.assets[0].uri;
      const relatedAssignments = assignments.filter((a) => a.projectId === proj.id);
      const totalPay = relatedAssignments.reduce((sum, a) => sum + Number(a.pay || 0), 0);
      if (!totalPay) {
        Alert.alert('Missing pay', 'No pay amount found for this gig.');
        return;
      }
      const amountCents = Math.round(totalPay * 100);
      await projectAPI.submitGigWork(proj.id, {
        proofImageUrl: uri,
        amountCents,
        title: proj.title,
        description: proj.description,
      });
      Alert.alert('Submitted', 'Your proof has been submitted for review.');
    } catch (err) {
      console.log('gig:submit:error', err?.response?.data || err.message);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit work');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Gigs</Text>
        {cards.length === 0 && <Text style={styles.muted}>No gigs assigned yet.</Text>}
        {cards.map((proj) => (
          <View key={proj.id} style={styles.card}>
            <TouchableOpacity onPress={() => handleOpen(proj.id)}>
              <Text style={styles.cardTitle}>{proj.title || 'Project'}</Text>
              <Text style={styles.cardMeta}>{proj.description || 'No description provided.'}</Text>
              <Text style={styles.cardMeta}>
                Assigned work: {assignments.filter((a) => a.projectId === proj.id).length}
              </Text>
              <Text style={styles.cardMeta}>
                Pay: $
                {assignments
                  .filter((a) => a.projectId === proj.id)
                  .reduce((sum, a) => sum + Number(a.pay || 0), 0)
                  .toLocaleString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={() => handleSubmitWork(proj)}>
              <Text style={styles.submitText}>Submit Work</Text>
            </TouchableOpacity>
          </View>
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
  submitButton: {
    marginTop: 8,
    backgroundColor: palette.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700' },
});

export default WorkerGigsScreen;
