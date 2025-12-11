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
                    navigation.navigate('ProjectOverview', { project, role: 'homeowner' })
                  }
                >
                  <Text style={styles.actionText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.action, styles.deleteAction]}
                  onPress={() => handleDelete(project.id)}
                >
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.address}>{project.projectType || 'Project'}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  muted: { color: palette.muted },
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
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: palette.text },
  cardSubtitle: { color: palette.muted, marginTop: 4, fontSize: 14 },
  cardMeta: { color: palette.muted, marginTop: 4, fontSize: 13.5 },
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
    borderRadius: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionText: { color: '#fff', fontWeight: '800' },
  deleteAction: {
    backgroundColor: '#FEE2E2',
  },
  deleteText: {
    color: '#B91C1C',
  },
});

export default ProjectsListScreen;
