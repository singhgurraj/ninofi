import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import VerificationBadge from '../../components/VerificationBadge';
import palette from '../../styles/palette';
import { glassCard, pillButton, pillButtonText, shadowCard } from '../../styles/ui';
import { loadOpenProjects, loadContractorProjects } from '../../services/projects';

const ContractorDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { openProjects, isLoadingOpen, contractorProjects, isLoadingContractor } = useSelector((state) => state.projects);
  const stats = {
    earnings: 8450,
    activeProjects: 0,
    rating: 4.8,
  };

  const loadProjects = useCallback(() => {
    if (user?.id) {
      dispatch(loadOpenProjects(user.id));
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>Hi {user?.fullName || 'Contractor'}</Text>
              <Text style={styles.heroSubtitle}>Licensed Contractor</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.notificationIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>This Month</Text>
              <Text style={styles.heroStatValue}>${stats.earnings}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Active</Text>
              <Text style={styles.heroStatValue}>{stats.activeProjects}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Rating</Text>
              <Text style={styles.heroStatValue}>{stats.rating}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.9}
          >
            <Text style={styles.heroButtonText}>View Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Verification Banner */}
        <View style={styles.verificationCard}>
          <View style={styles.verificationHeader}>
            <View style={styles.verificationCopy}>
              <Text style={styles.verificationTitle}>Account Verification</Text>
              <Text style={styles.verificationMessage}>
                Complete verification to unlock all payouts and top projects.
              </Text>
            </View>
            <VerificationBadge status="pending" />
          </View>
          <TouchableOpacity
            style={styles.verificationButton}
            onPress={() => navigation.navigate('Verification')}
          >
            <Text style={styles.verificationButtonText}>View Status</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.cardGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, shadowCard]}
              onPress={() => navigation.navigate('FindJobs')}
            >
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionTitle}>Find Jobs</Text>
              <Text style={styles.actionText}>Browse nearby gigs</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionCard, shadowCard]}
              onPress={() => navigation.navigate('SubmitMilestone', {
                project: projects[0],
                milestone: { name: projects[0].nextMilestone, amount: projects[0].amount }
            })}
            >
              <Text style={styles.actionIcon}>📸</Text>
              <Text style={styles.actionTitle}>Submit Work</Text>
              <Text style={styles.actionText}>Send milestone evidence</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionCard, shadowCard]}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Text style={styles.actionIcon}>💰</Text>
              <Text style={styles.actionTitle}>My Wallet</Text>
              <Text style={styles.actionText}>Balance & transfers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionCard, shadowCard]}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionTitle}>My Profile</Text>
              <Text style={styles.actionText}>Licenses & docs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Projects</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FindJobs')}>
              <Text style={styles.viewAll}>Find Jobs</Text>
            </TouchableOpacity>
          </View>

          {isLoadingContractor && <Text style={styles.muted}>Loading projects…</Text>}
          {!isLoadingContractor && (!contractorProjects || contractorProjects.length === 0) && (
            <Text style={styles.muted}>No active projects yet.</Text>
          )}
          {!isLoadingContractor &&
            contractorProjects?.map((project) => (
              <View key={project.id} style={styles.projectCard}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectTitle}>{project.title}</Text>
                  <Text style={styles.projectStatus}>{project.projectType || 'Project'}</Text>
                </View>
                <Text style={styles.projectClient}>{project.address || 'No address provided'}</Text>
                <Text style={styles.milestoneLabel}>
                  Milestones: {project.milestones?.length || 0}
                </Text>
                <Text style={styles.milestoneAmount}>
                  Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}
                </Text>
              </View>
            ))}
        </View>

        {/* Recent Payments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <TouchableOpacity onPress={() => console.log('View All - Coming soon')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentCard}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Kitchen Demo Complete</Text>
              <Text style={styles.paymentDate}>Jan 18, 2025</Text>
            </View>
            <Text style={styles.paymentAmount}>+$2,500</Text>
          </View>
          
          <View style={styles.paymentCard}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Bathroom Tile Work</Text>
              <Text style={styles.paymentDate}>Jan 15, 2025</Text>
            </View>
            <Text style={styles.paymentAmount}>+$1,800</Text>
          </View>
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
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#3B2A68',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    backgroundColor: '#7E4DFF',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroGreeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    color: '#EAE5FF',
    marginTop: 4,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  heroStat: {
    flex: 1,
  },
  heroStatLabel: {
    color: '#EAE5FF',
    fontSize: 12,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  heroButtonText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 15,
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
  verificationCard: {
    margin: 20,
    marginTop: 12,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#3B2A68',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  verificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  verificationMessage: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  verificationButton: {
    backgroundColor: palette.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  verificationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1EAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: palette.text,
  },
  statLabel: {
    fontSize: 12,
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
    marginBottom: 12,
    color: palette.text,
  },
  viewAll: {
    fontSize: 14,
    color: palette.primary,
    fontWeight: '500',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  actionCard: {
    flexBasis: '48%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#3B2A68',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  actionTitle: {
    fontWeight: '700',
    color: palette.text,
  },
  actionText: {
    color: palette.muted,
    marginTop: 4,
    fontSize: 12,
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
  projectClient: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 15,
  },
  milestoneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneLabel: {
    fontSize: 14,
    color: palette.text,
  },
  milestoneAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E6DAFF',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 3,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: palette.text,
  },
  paymentDate: {
    fontSize: 14,
    color: palette.muted,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#41C87A',
  },
  muted: {
    color: palette.muted,
  },
});

export default ContractorDashboard;
