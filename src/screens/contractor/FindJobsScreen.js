import React, { useCallback, useEffect } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { loadOpenProjects } from '../../services/projects';
import palette from '../../styles/palette';

const FindJobsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { openProjects, isLoadingOpen, appliedProjectIds } = useSelector((state) => state.projects);

  const fetchJobs = useCallback(() => {
    if (user?.id) {
      dispatch(loadOpenProjects(user.id));
    }
  }, [dispatch, user?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  const renderMediaThumb = (media = []) => {
    const first = media.find((m) => m?.url);
    if (!first?.url) return null;
    return <Image source={{ uri: first.url }} style={styles.thumb} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Find Jobs</Text>
          <TouchableOpacity onPress={fetchJobs}>
            <Text style={styles.refresh}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {isLoadingOpen && <Text style={styles.muted}>Loading jobs…</Text>}
        {!isLoadingOpen && (!openProjects || openProjects.length === 0) && (
          <Text style={styles.muted}>No open projects right now.</Text>
        )}
        {openProjects
          ?.filter((p) => !appliedProjectIds.includes(p.id))
          .map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.card}
              onPress={() => navigation.navigate('ContractorProjectDetails', { project })}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{project.title}</Text>
                  <Text style={styles.cardMeta}>{project.projectType || 'Project'}</Text>
                  <Text style={styles.cardMeta}>
                    Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.cardMeta}>{project.address || 'No address provided'}</Text>
                </View>
                {renderMediaThumb(project.media)}
              </View>
              <Text style={styles.cardMeta}>
                Milestones: {project.milestones?.length || 0}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  refresh: { color: palette.primary, fontWeight: '700', fontSize: 14 },
  muted: { color: palette.muted, fontSize: 13.5 },
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
  cardHeader: { flexDirection: 'row', gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: palette.text },
  cardMeta: { color: palette.muted, marginTop: 4, fontSize: 13.5 },
  thumb: { width: 78, height: 78, borderRadius: 14, backgroundColor: '#EEF2FF' },
});

export default FindJobsScreen;
