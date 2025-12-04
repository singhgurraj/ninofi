import React, { useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import palette from '../../styles/palette';
import { loadProjectsForUser } from '../../services/projects';
import { loadNotifications } from '../../services/notifications';

const HomeownerDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { projects, isLoading } = useSelector((state) => state.projects);
  const { items: notifications } = useSelector((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchProjects = useCallback(() => {
    if (user?.id) {
      dispatch(loadProjectsForUser(user.id));
      dispatch(loadNotifications(user.id));
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

  const stats = {
    activeProjects: projects?.length || 0,
    inEscrow: projects?.reduce(
      (sum, project) => sum + (project.estimatedBudget || 0),
      0
    ),
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back, {user?.fullName || 'User'}</Text>
            <Text style={styles.role}>Homeowner</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔨</Text>
            <Text style={styles.statValue}>{stats.activeProjects}</Text>
            <Text style={styles.statLabel}>Active Projects</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>${stats.inEscrow.toLocaleString()}</Text>
            <Text style={styles.statLabel}>In Escrow</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateProject')}
            >
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionText}>New Project</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButtonOutline}
              onPress={() => console.log('Find Contractors - Coming soon')}
            >
              <Text style={styles.actionIconOutline}>🔍</Text>
              <Text style={styles.actionTextOutline}>Find Contractors</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Projects</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProjectsList')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <Text style={styles.loadingText}>Loading projects…</Text>
          )}

          {!isLoading && (!projects || projects.length === 0) && (
            <Text style={styles.mutedText}>No projects yet. Create one to get started.</Text>
          )}

          {projects?.map((project) => {
            const progress =
              project.milestones && project.milestones.length
                ? Math.round(
                    (project.milestones.filter((m) => m.status === 'completed').length /
                      project.milestones.length) *
                      100
                  )
                : 0;

            return (
            <TouchableOpacity 
              key={project.id}
              style={styles.projectCard}
              onPress={() =>
                navigation.navigate('ProjectOverview', { project, role: 'homeowner' })
              }
            >
              <View style={styles.projectHeader}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <Text style={styles.projectStatus}>{project.projectType || 'Project'}</Text>
              </View>
              
             
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressValue}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progress}%` }
                  ]} 
                />
              </View>
              
              <View style={styles.projectFooter}>
                <Text style={styles.budget}>
                  Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: palette.text,
  },
  role: {
    fontSize: 16,
    color: palette.muted,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: palette.text,
  },
  statLabel: {
    fontSize: 14,
    color: palette.muted,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: palette.text,
  },
  viewAll: {
    fontSize: 14,
    color: palette.primary,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: palette.primary,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonOutline: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.primary,
  },
  actionIconOutline: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTextOutline: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  projectCard: {
    backgroundColor: palette.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: palette.border,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    color: palette.text,
  },
  projectStatus: {
    fontSize: 12,
    color: palette.primary,
    backgroundColor: '#EEE4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  projectContractor: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 15,
  },
  assigned: {
    color: palette.primary,
    fontWeight: '600',
    marginBottom: 10,
  },
  assignedPending: {
    color: palette.muted,
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: palette.muted,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E6DAFF',
    borderRadius: 4,
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 4,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingText: {
    color: palette.muted,
    marginBottom: 12,
  },
  mutedText: {
    color: palette.muted,
  },
  budget: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  viewDetails: {
    fontSize: 14,
    color: palette.primary,
    fontWeight: '500',
  },
});

export default HomeownerDashboard;
