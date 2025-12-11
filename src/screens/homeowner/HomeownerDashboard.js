import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadNotifications } from '../../services/notifications';
import { createConnectAccountLink, fetchStripeStatus } from '../../services/payments';
import { loadProjectsForUser } from '../../services/projects';
import palette from '../../styles/palette';

const HomeownerDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { projects, isLoading } = useSelector((state) => state.projects);
  const { items: notifications } = useSelector((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  const isStripeConnected =
    !!((stripeStatus?.accountId || user?.stripe_account_id) &&
    ((stripeStatus?.payoutsEnabled ?? user?.stripePayoutsEnabled) ||
      (stripeStatus?.chargesEnabled ?? user?.stripeChargesEnabled)));
  const [hasSeenConnected, setHasSeenConnected] = useState(false);
  const [hasSeenLoaded, setHasSeenLoaded] = useState(false);
  const lastConnectedRef = useRef(false);

  const fetchProjects = useCallback(() => {
    if (user?.id) {
      dispatch(loadProjectsForUser(user.id));
      dispatch(loadNotifications(user.id));
    }
  }, [dispatch, user?.id]);

  const loadStripeStatus = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetchStripeStatus(user.id);
    if (res.success) {
      setStripeStatus(res.data);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProjects();
    loadStripeStatus();
  }, [fetchProjects, loadStripeStatus]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadStripeStatus();
      }
    });
    return () => sub.remove();
  }, [loadStripeStatus]);

  useEffect(() => {
    const loadSeen = async () => {
      try {
        const value = await AsyncStorage.getItem('stripe_connected_seen_homeowner');
        if (value === 'true') setHasSeenConnected(true);
      } catch (_err) {
        // ignore
      } finally {
        setHasSeenLoaded(true);
      }
    };
    loadSeen();
  }, []);

  useEffect(() => {
    if (!lastConnectedRef.current && isStripeConnected && hasSeenLoaded && !hasSeenConnected) {
      Alert.alert('Success', 'Successfully connected bank');
      setHasSeenConnected(true);
      AsyncStorage.setItem('stripe_connected_seen_homeowner', 'true').catch(() => {});
    }
    lastConnectedRef.current = isStripeConnected;
  }, [hasSeenConnected, hasSeenLoaded, isStripeConnected]);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
      loadStripeStatus();
    }, [fetchProjects, loadStripeStatus])
  );

  const handleConnectBank = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Unavailable', 'Sign in first.');
      return;
    }
    setIsConnectingStripe(true);
    const res = await createConnectAccountLink(user.id);
    setIsConnectingStripe(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to start Stripe onboarding');
      return;
    }
    const url = res.data?.url;
    if (url) {
      try {
        await Linking.openURL(url);
      } catch (_err) {
        Alert.alert('Error', 'Could not open Stripe onboarding link');
      }
    }
    loadStripeStatus();
  }, [user?.id, loadStripeStatus]);

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
              <Text
                style={styles.actionText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                New Project
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButtonOutline}
              onPress={() => navigation.navigate('ContractorSearch')}
            >
              <Text style={styles.actionIconOutline}>🔍</Text>
              <Text
                style={styles.actionTextOutline}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Find Contractors
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Contracts')}
            >
              <Text style={styles.actionIcon}>📝</Text>
              <Text
                style={styles.actionText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Contracts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleConnectBank}
              disabled={isConnectingStripe}
            >
              <Text style={styles.actionIcon}>🏦</Text>
              <Text
                style={styles.actionText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {isConnectingStripe ? 'Opening...' : 'Connect Bank'}
              </Text>
            </TouchableOpacity>
            {isStripeConnected && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Wallet')}
              >
                <Text style={styles.actionIcon}>💰</Text>
                <Text
                  style={styles.actionText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  My Wallet
                </Text>
              </TouchableOpacity>
            )}
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
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    color: palette.text,
    letterSpacing: 0.2,
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
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    color: palette.primaryDark,
  },
  statLabel: {
    fontSize: 14,
    color: palette.muted,
  },
  section: {
    padding: 20,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 14,
    color: palette.text,
  },
  viewAll: {
    fontSize: 14,
    color: palette.primary,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: palette.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionButtonOutline: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.primary,
    shadowColor: '#1E293B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionIconOutline: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTextOutline: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  projectCard: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#1E293B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    color: palette.text,
  },
  projectStatus: {
    fontSize: 12,
    color: palette.primary,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    fontWeight: '700',
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
    fontWeight: '700',
    color: palette.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E7FF',
    borderRadius: 6,
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 6,
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
