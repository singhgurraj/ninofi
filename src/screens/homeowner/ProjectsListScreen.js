import React, { useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import palette from '../../styles/palette';
import { loadProjectsForUser, removeProject } from '../../services/projects';

const ProjectsListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { projects, isLoading } = useSelector((state) => state.projects);

  useEffect(() => {
    const parent = navigation.getParent?.();
    const unsubscribe = parent?.addListener('tabPress', () => {
      navigation.navigate('Dashboard');
    });
    return unsubscribe;
  }, [navigation]);

  const fetchProjects = useCallback(() => {
    if (user?.id) {
      dispatch(loadProjectsForUser(user.id));
    }
  }, [dispatch, user?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  const handleDelete = async (projectId) => {
    if (!projectId) return;
    await dispatch(removeProject(projectId, user?.id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your Projects</Text>
        {isLoading && <Text style={styles.muted}>Loading…</Text>}
        {!isLoading && (!projects || projects.length === 0) && (
          <Text style={styles.muted}>No projects yet.</Text>
        )}
        {projects?.map((project) => (
          <View key={project.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{project.title}</Text>
                <Text style={styles.cardSubtitle}>{project.projectType || 'Project'}</Text>
                <Text style={styles.cardMeta}>
                  Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.action}
                  onPress={() =>
                    navigation.navigate('CreateProject', { project, origin: 'ProjectsList' })
                  }
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.action, styles.deleteAction]}
                  onPress={() => handleDelete(project.id)}
                >
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.address}>{project.address || 'No address provided'}</Text>
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
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  cardSubtitle: { color: palette.muted, marginTop: 4 },
  cardMeta: { color: palette.muted, marginTop: 4, fontSize: 13 },
  address: { marginTop: 10, color: palette.text },
  cardActions: { flexDirection: 'column', gap: 8 },
  homeButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.primary,
    borderRadius: 8,
    marginBottom: 6,
  },
  homeButtonText: { color: '#fff', fontWeight: '600' },
  action: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  actionText: { color: '#fff', fontWeight: '600' },
  deleteAction: {
    backgroundColor: '#FEE2E2',
  },
  deleteText: {
    color: '#B91C1C',
  },
});

export default ProjectsListScreen;
