import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSelector } from 'react-redux';

const HomeownerDashboard = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const { projects } = useSelector((state) => state.projects);

  const stats = {
    activeProjects: projects?.length || 0,
    inEscrow: projects?.reduce((sum, project) => sum + (project.budget || 0), 0),
  };

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

          {projects?.map((project) => (
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


export default HomeownerDashboard;
