import React from 'react';
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

const HomeownerDashboard = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Mock data for now
  const stats = {
    activeProjects: 3,
    inEscrow: 12500,
  };

  const projects = [
    {
      id: '1',
      title: 'Kitchen Renovation',
      contractor: 'BuildCorp Contractors',
      status: 'In Progress',
      progress: 65,
      budget: 8500,
    },
    {
      id: '2',
      title: 'Bathroom Remodel',
      contractor: 'ProTile Solutions',
      status: 'Pending Approval',
      progress: 90,
      budget: 4000,
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
            <Text style={styles.greeting}>Welcome back, {user?.fullName || 'User'}</Text>
            <Text style={styles.role}>Homeowner</Text>
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
            <TouchableOpacity onPress={() => console.log('View All - Coming soon')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {projects.map((project) => (
            <TouchableOpacity 
              key={project.id}
              style={styles.projectCard}
              onPress={() => navigation.navigate('ProjectDetails', { project })}
            >
              <View style={styles.projectHeader}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <Text style={styles.projectStatus}>{project.status}</Text>
              </View>
              
              <Text style={styles.projectContractor}>
                With {project.contractor}
              </Text>
              
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressValue}>{project.progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${project.progress}%` }
                  ]} 
                />
              </View>
              
              <View style={styles.projectFooter}>
                <Text style={styles.budget}>Budget: ${project.budget}</Text>
                <Text style={styles.viewDetails}>View Details →</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
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
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    padding: 20,
    borderRadius: 12,
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
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  actionIconOutline: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTextOutline: {
    color: '#1976D2',
    fontSize: 16,
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
  projectContractor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 4,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budget: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewDetails: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
});

export default HomeownerDashboard;