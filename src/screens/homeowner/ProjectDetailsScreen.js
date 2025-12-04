import React from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const ProjectDetailsScreen = ({ route, navigation }) => {
  const { project } = route.params || {
    project: {
      title: 'Kitchen Renovation',
      contractor: 'Elite Kitchen Solutions',
      status: 'In Progress',
      progress: 50,
      budget: 15000,
      released: 8500,
      milestones: [
        { id: '1', name: 'Demolition Complete', amount: 2500, status: 'approved', date: 'Jan 18, 2025' },
        { id: '2', name: 'Plumbing Installation', amount: 3000, status: 'submitted', date: '2 hours ago' },
        { id: '3', name: 'Electrical Work', amount: 2000, status: 'pending', date: null },
        { id: '4', name: 'Cabinet Installation', amount: 3500, status: 'pending', date: null },
      ],
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'submitted': return '#FF9800';
      case 'pending': return '#999';
      default: return '#999';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'submitted': return 'Review Needed';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{project.title}</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuText}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{project.status}</Text>
          </View>
          <Text style={styles.startDate}>Started Jan 15, 2025</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            Progress: {project.milestones?.filter(m => m.status === 'approved').length || 0} of {project.milestones?.length || 0} milestones
          </Text>
          <Text style={styles.progressAmount}>
            ${project.released} / ${project.budget} released
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
          </View>
          <Text style={styles.completionText}>{project.progress}% Complete • Est. completion: Mar 1, 2025</Text>
        </View>

{/* Quick Actions */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Quick Actions</Text>
  <View style={styles.quickActions}>
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={() => {
        // Find milestone that needs review
        const submittedMilestone = project.milestones?.find(m => m.status === 'submitted');
        if (submittedMilestone) {
          navigation.navigate('ReviewMilestone', { 
            milestone: {
              name: submittedMilestone.name,
              amount: submittedMilestone.amount,
              project: project.title,
              contractor: project.contractor,
              rating: 4.8,
              reviews: 127,
              description: 'Completed installation of all new plumbing lines for kitchen sink, dishwasher, and ice maker. Installed new shut-off valves and tested all connections.',
              photos: [
                'https://via.placeholder.com/400x300/E3F2FD/1976D2?text=Under+Sink',
                'https://via.placeholder.com/400x300/E3F2FD/1976D2?text=Water+Lines',
              ],
              submittedDate: submittedMilestone.date || 'Jan 22, 2025',
            }
          });
        } else {
          Alert.alert('No Milestones', 'No milestones are awaiting your review');
        }
      }}
    >
      <Text style={styles.actionIcon}>✓</Text>
      <Text style={styles.actionText}>Review Milestone</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={styles.actionButtonOutline}
      onPress={() => navigation.navigate('Chat', { project })}
    >
      <Text style={styles.actionIconOutline}>💬</Text>
      <Text style={styles.actionTextOutline}>Contact</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={styles.actionButtonOutline}
      onPress={() => console.log('Call - Coming soon')}
    >
      <Text style={styles.actionIconOutline}>📞</Text>
      <Text style={styles.actionTextOutline}>Call</Text>
    </TouchableOpacity>
  </View>
</View>

        {/* Contractor Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contractor</Text>
          <View style={styles.contractorCard}>
            <View style={styles.contractorInfo}>
              <Text style={styles.contractorName}>{project.contractor}</Text>
              <Text style={styles.contractorRating}>⭐ 4.8 (127 reviews) • Verified</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewProfile}>View Profile →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {project.milestones?.map((milestone) => (
            <TouchableOpacity 
              key={milestone.id}
              style={styles.milestoneCard}
              onPress={() => {
                if (milestone.status === 'submitted') {
                  console.log('Review milestone - Coming soon');
                }
              }}
            >
              <View style={styles.milestoneHeader}>
                <View style={styles.milestoneIcon}>
                  <Text style={styles.milestoneIconText}>
                    {milestone.status === 'approved' ? '✓' : 
                     milestone.status === 'submitted' ? '⏱' : '○'}
                  </Text>
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneName}>{milestone.name}</Text>
                  {milestone.date && (
                    <Text style={styles.milestoneDate}>
                      {milestone.status === 'approved' ? 'Approved' : 'Submitted'} {milestone.date}
                    </Text>
                  )}
                </View>
                <Text style={styles.milestoneAmount}>${milestone.amount}</Text>
              </View>
              
              {milestone.status === 'submitted' && (
                <View style={styles.milestoneActions}>
                  <Text style={styles.reviewNeeded}>📸 Review photos & approve payment</Text>
                </View>
              )}
              
              <View style={[
                styles.milestoneStatus,
                { backgroundColor: `${getStatusColor(milestone.status)}15` }
              ]}>
                <Text style={[styles.milestoneStatusText, { color: getStatusColor(milestone.status) }]}>
                  {getStatusLabel(milestone.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
<View style={styles.bottomActions}>
  <TouchableOpacity 
    style={styles.addFundsButton}
    onPress={() => navigation.navigate('FundProject', { 
      project: {
        title: project.title,
        budget: project.budget,
        milestones: project.milestones
      }
    })}
  >
    <Text style={styles.addFundsText}>Add Funds</Text>
  </TouchableOpacity>
  <TouchableOpacity 
    style={styles.supportButton}
    onPress={() => console.log('Contact Support - Coming soon')}
  >
    <Text style={styles.supportText}>Contact Support</Text>
  </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 24,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  statusBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  startDate: {
    fontSize: 14,
    color: '#666',
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  progressAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 4,
  },
  completionText: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonOutline: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
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
    fontSize: 12,
    fontWeight: '600',
  },
  contractorCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  contractorRating: {
    fontSize: 14,
    color: '#666',
  },
  viewProfile: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  milestoneIconText: {
    fontSize: 18,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: 12,
    color: '#666',
  },
  milestoneAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  milestoneActions: {
    marginBottom: 10,
  },
  reviewNeeded: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  milestoneStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  milestoneStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    paddingBottom: 40,
  },
  addFundsButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addFundsText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  supportButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  supportText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectDetailsScreen;
