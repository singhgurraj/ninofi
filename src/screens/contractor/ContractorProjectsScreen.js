import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { loadContractorProjects } from '../../services/projects';
import palette from '../../styles/palette';

const ContractorProjectsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { contractorProjects, isLoadingContractor } = useSelector((state) => state.projects);

  const loadProjects = useCallback(() => {
    if (user?.id) {
      dispatch(loadContractorProjects(user.id));
    }
  }, [dispatch, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Projects</Text>
        {isLoadingContractor && <Text style={styles.muted}>Loading projects…</Text>}
        {!isLoadingContractor && (!contractorProjects || contractorProjects.length === 0) && (
          <Text style={styles.muted}>No active projects yet.</Text>
        )}
        {!isLoadingContractor &&
          contractorProjects?.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.card}
              onPress={() => navigation.navigate('ProjectOverview', { project, role: 'contractor' })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{project.title}</Text>
                <Text style={styles.cardTag}>{project.projectType || 'Project'}</Text>
              </View>
              <Text style={styles.cardMeta}>{project.address || 'No address provided'}</Text>
              <Text style={styles.cardMeta}>Milestones: {project.milestones?.length || 0}</Text>
              <Text style={styles.cardMeta}>
                Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  muted: { color: palette.muted, fontSize: 13.5 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '800', color: palette.text, flex: 1, fontSize: 18 },
  cardTag: {
    backgroundColor: palette.primary,
    color: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: { color: palette.muted, fontSize: 13 },
});

export default ContractorProjectsScreen;
