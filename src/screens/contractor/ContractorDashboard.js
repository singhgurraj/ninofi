import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../services/auth';

const ContractorDashboard = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Mock data
  const stats = {
    earnings: 8450,
    activeProjects: 3,
    rating: 4.8,
  };

  const projects = [
    {
      id: '1',
      title: 'Kitchen Renovation',
      client: 'Sarah Wilson',
      location: 'Downtown',
      status: 'In Progress',
      nextMilestone: 'Plumbing Installation',
      amount: 3000,
      progress: 45,
    },
    {
      id: '2',
      title: 'Bathroom Remodel',
      client: 'Mark Davis',
      location: 'Westside',
      status: 'Pending',
      nextMilestone: 'Tile Installation',
      amount: 1800,
      progress: 80,
    },
  ];

  const handleLogout = async () => {
    await dispatch(logout());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{user?.fullName || 'Contractor'}</Text>
            <Text style={styles.role}>Licensed Contractor</Text>
          </View>
          <View style={styles.headerButtons}>
  <TouchableOpacity style={styles.notificationButton}>
    <Text style={styles.notificationIcon}>🔔</Text>
  </TouchableOpacity>
  <TouchableOpacity 
    style={styles.notificationButton}
    onPress={() => navigation.navigate('Profile')}
  >
    <Text style={styles.notificationIcon}>⚙️</Text>
  </TouchableOpacity>
  <TouchableOpacity 
    style={styles.notificationButton}
    onPress={handleLogout}
  >
    <Text style={styles.notificationIcon}>🚪</Text>
  </TouchableOpacity>
</View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${stats.earnings}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeProjects}</Text>
            <Text style={styles.statLabel}>Active Projects</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => console.log('Find Jobs - Coming soon')}
            >
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionText}>Find Jobs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('SubmitMilestone', {
                project: projects[0],
                milestone: { name: projects[0].nextMilestone, amount: projects[0].amount }
            })}
            >
              <Text style={styles.actionIcon}>📸</Text>
              <Text style={styles.actionText}>Submit Work</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButtonOutline}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Text style={styles.actionIconOutline}>💰</Text>
              <Text style={styles.actionTextOutline}>My Wallet</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButtonOutline}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.actionIconOutline}>👤</Text>
              <Text style={styles.actionTextOutline}>My Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Projects</Text>
            <TouchableOpacity onPress={() => console.log('View All - Coming soon')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {projects.map((project) => (
            <TouchableOpacity 
              key={project.id}
              style={styles.projectCard}
              onPress={() => console.log('Project Details - Coming soon', project.title)}
            >
              <View style={styles.projectHeader}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <Text style={styles.projectStatus}>{project.status}</Text>
              </View>
              
              <Text style={styles.projectClient}>
                {project.client} • {project.location}
              </Text>
              
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneLabel}>Next: {project.nextMilestone}</Text>
                <Text style={styles.milestoneAmount}>${project.amount}</Text>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${project.progress}%` }
                  ]} 
                />
              </View>
            </TouchableOpacity>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    color: '#666',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
  },
  viewAll: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonOutline: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionIconOutline: {
    fontSize: 20,
    marginBottom: 5,
  },
  actionTextOutline: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
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
  },
  projectStatus: {
    fontSize: 12,
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  projectClient: {
    fontSize: 14,
    color: '#666',
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
    color: '#333',
  },
  milestoneAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 3,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default ContractorDashboard;