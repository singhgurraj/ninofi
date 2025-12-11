import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';
import { useSelector, useDispatch } from 'react-redux';
import { addWorkerAssignment, addWorkerProject, removeWorkerProject, updateWorkerAssignment } from '../../store/projectSlice';
import CheckInButton from '../../components/CheckInButton';

const WorkerProjectScreen = ({ route, navigation }) => {
  const { projectId } = route.params || {};
  const dispatch = useDispatch();
  const { workerAssignments } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await projectAPI.getProjectDetails(projectId);
      setProject(res.data);
      dispatch(addWorkerProject(res.data));
    } catch (err) {
      console.log('worker:project:load:error', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const assignments = (workerAssignments || []).filter(
    (a) => a.workerId === user?.id && a.projectId === projectId
  );

  const attachments = project?.media || [];

  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        const taskRes = await projectAPI.listWorkerTasks(user.id);
        const tasks = taskRes.data?.tasks || [];
        tasks
          .filter((t) => t.projectId === projectId)
          .forEach((t) => {
            dispatch(
              addWorkerAssignment({
                id: t.id,
                projectId: t.projectId,
                workerId: user.id,
                description: t.description,
                dueDate: t.dueDate || '',
                pay: t.pay || 0,
                status: t.status,
                proofImageUrl: t.proofImageUrl || null,
              })
            );
          });
      } catch (err) {
        console.log('worker:load:tasks:error', err?.response?.data || err.message);
      }
    })();
  }, [user?.id, projectId]);

  const assigned = assignments.filter(
    (a) =>
      a.workerId === user?.id &&
      !['SUBMITTED', 'UNDER_REVIEW'].includes((a.status || '').toUpperCase())
  );
  const pending = assignments.filter((a) =>
    ['SUBMITTED', 'UNDER_REVIEW'].includes((a.status || '').toUpperCase())
  );

  const handleSubmit = async (task) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to submit work.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.7 });
      if (result.canceled || !result.assets?.length) return;
      const uri = result.assets[0].uri;
      if (!task.id) {
        Alert.alert('Missing task', 'Task identifier is missing.');
        return;
      }
      await projectAPI.submitTaskProof(task.id, { proofImageUrl: uri });
      dispatch(
        updateWorkerAssignment({
          id: task.id,
          status: 'SUBMITTED',
          proofImageUrl: uri,
        })
      );
      Alert.alert('Submitted', 'Your proof has been submitted for review.');
    } catch (err) {
      console.log('task:submit:error', err?.response?.data || err.message);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit work');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{project?.title || 'Project'}</Text>
        <View style={styles.checkInWrapper}>
          <CheckInButton projectId={projectId} userId={user?.id} userType="worker" />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Project Address</Text>
          <Text style={styles.body}>{project?.address || 'No address provided.'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.body}>{project?.description || 'No description provided.'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attachments</Text>
          {attachments.length === 0 ? (
            <Text style={styles.muted}>No attachments.</Text>
          ) : (
            attachments.map((m, idx) => (
              <Text key={`${m.id || m.url || 'att'}-${idx}`} style={styles.link}>
                {m.label || 'Attachment'} - {m.url}
              </Text>
            ))
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Work</Text>
          {assigned.length === 0 ? (
            <Text style={styles.muted}>No work assigned yet.</Text>
          ) : (
            assigned.map((a) => (
              <View key={a.id} style={styles.contractCard}>
                <View style={styles.contractHeader}>
                  <Text style={styles.contractTitle}>{a.description || 'Assigned Work'}</Text>
                  <Text style={styles.contractStatus}>Pay ${Number(a.pay || 0).toLocaleString()}</Text>
                </View>
                <Text style={styles.contractMeta}>Due: {a.dueDate || 'TBD'}</Text>
                <TouchableOpacity style={styles.submitButton} onPress={() => handleSubmit(a)}>
                  <Text style={styles.submitText}>Submit Work</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Work</Text>
          {pending.length === 0 ? (
            <Text style={styles.muted}>No pending submissions.</Text>
          ) : (
            pending.map((a) => (
              <View key={a.id} style={styles.contractCard}>
                <View style={styles.contractHeader}>
                  <Text style={styles.contractTitle}>{a.description || 'Work submission'}</Text>
                  <Text style={styles.contractStatus}>{(a.status || '').toString()}</Text>
                </View>
                <Text style={styles.contractMeta}>Submitted</Text>
              </View>
            ))
          )}
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ProjectPersonnel', { project, role: 'worker' })}
        >
          <Text style={styles.primaryText}>People</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={async () => {
            const res = await projectAPI.leaveProject(projectId, { workerId: user?.id });
            if (res?.status === 200 || res?.data?.status === 'left') {
              dispatch(removeWorkerProject(projectId));
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.leaveText}>Leave Project</Text>
        </TouchableOpacity>
        {loading && <Text style={styles.muted}>Loading…</Text>}
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
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 6,
  },
  cardTitle: { fontWeight: '700', color: palette.text },
  link: { color: palette.primary },
  body: { color: palette.text },
  assignmentRow: { gap: 2, paddingVertical: 4 },
  assignmentText: { color: palette.text, fontWeight: '600' },
  assignmentMeta: { color: palette.muted, fontSize: 12 },
  contractCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 6,
    gap: 4,
  },
  contractHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contractTitle: { fontWeight: '700', color: palette.text, flex: 1 },
  contractStatus: { color: palette.muted, fontWeight: '700', marginLeft: 8 },
  checkInWrapper: {
    marginVertical: 6,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: palette.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700' },
  primaryButton: {
    marginTop: 8,
    backgroundColor: palette.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  leaveButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  leaveText: { color: '#c1121f', fontWeight: '700' },
});

export default WorkerProjectScreen;
