import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';
import { useSelector, useDispatch } from 'react-redux';
import { addWorkerProject, removeWorkerProject } from '../../store/projectSlice';

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{project?.title || 'Project'}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.body}>{project?.description || 'No description provided.'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attachments</Text>
          {attachments.length === 0 ? (
            <Text style={styles.muted}>No attachments.</Text>
          ) : (
            attachments.map((m) => (
              <Text key={m.id || m.url} style={styles.link}>
                {m.label || 'Attachment'} - {m.url}
              </Text>
            ))
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Work</Text>
          {assignments.length === 0 ? (
            <Text style={styles.muted}>No work assigned yet.</Text>
          ) : (
            assignments.map((a) => (
              <View key={a.id} style={styles.assignmentRow}>
                <Text style={styles.assignmentText}>{a.description}</Text>
                <Text style={styles.assignmentMeta}>Due: {a.dueDate || 'TBD'}</Text>
                <Text style={styles.assignmentMeta}>Pay: ${Number(a.pay || 0).toLocaleString()}</Text>
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
  assignmentRow: { gap: 2, paddingVertical: 4 },
  assignmentText: { color: palette.text, fontWeight: '600' },
  assignmentMeta: { color: palette.muted, fontSize: 12 },
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
