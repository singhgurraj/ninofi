import React from 'react';
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const ReviewMilestoneScreen = ({ route, navigation }) => {
  const { milestone } = route.params || {
    milestone: {
      name: 'Plumbing Installation',
      amount: 3000,
      project: 'Kitchen Renovation',
      contractor: 'Elite Kitchen Solutions',
      rating: 4.8,
      reviews: 127,
      description: 'Completed installation of all new plumbing lines for kitchen sink, dishwasher, and ice maker. Installed new shut-off valves and tested all connections. All work meets local building codes and has been pressure tested.',
      photos: [
        'https://via.placeholder.com/400x300/E3F2FD/1976D2?text=Under+Sink',
        'https://via.placeholder.com/400x300/E3F2FD/1976D2?text=Water+Lines',
        'https://via.placeholder.com/400x300/E3F2FD/1976D2?text=Connections',
      ],
      submittedDate: 'Jan 22, 2025',
    }
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Milestone',
      `Release $${milestone.amount} to contractor?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Release',
          onPress: () => {
            Alert.alert('Success', 'Payment released to contractor!', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        }
      ]
    );
  };

  const handleRequestChanges = () => {
    Alert.alert(
      'Request Changes',
      'Ask the contractor to make changes to this milestone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Changes',
          onPress: () => {
            Alert.alert('Changes Requested', 'Contractor has been notified', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        }
      ]
    );
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
          <Text style={styles.headerTitle}>Review Milestone</Text>
          <TouchableOpacity>
            <Text style={styles.helpIcon}>?</Text>
          </TouchableOpacity>
        </View>

        {/* Milestone Info */}
        <View style={styles.milestoneCard}>
          <Text style={styles.milestoneName}>{milestone.name}</Text>
          <Text style={styles.milestoneAmount}>${milestone.amount}</Text>
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>Submitted: {milestone.submittedDate}</Text>
            <Text style={styles.metaText}>{milestone.project}</Text>
          </View>
        </View>

        {/* Contractor Info */}
        <View style={styles.contractorCard}>
          <View style={styles.contractorInfo}>
            <Text style={styles.contractorName}>{milestone.contractor}</Text>
            <Text style={styles.contractorRating}>
              ⭐ {milestone.rating} ({milestone.reviews} reviews) • Verified
            </Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.messageButton}>💬</Text>
          </TouchableOpacity>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Completed</Text>
          <Text style={styles.description}>{milestone.description}</Text>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos & Videos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {milestone.photos?.map((photo, index) => (
              <TouchableOpacity key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoIcon}>🔍</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Inspection Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Checklist</Text>
          <View style={styles.checklistCard}>
            <View style={styles.checklistItem}>
              <Text style={styles.checklistIcon}>○</Text>
              <Text style={styles.checklistText}>Work matches description</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checklistIcon}>○</Text>
              <Text style={styles.checklistText}>Quality meets expectations</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checklistIcon}>○</Text>
              <Text style={styles.checklistText}>Area cleaned up</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checklistIcon}>○</Text>
              <Text style={styles.checklistText}>Photos clearly show completed work</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.questionButton}
            onPress={() => Alert.alert('Ask Question', 'Message feature coming soon')}
          >
            <Text style={styles.questionIcon}>💬</Text>
            <Text style={styles.questionText}>Ask Question</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.changesButton}
            onPress={handleRequestChanges}
          >
            <Text style={styles.changesIcon}>✕</Text>
            <Text style={styles.changesText}>Request Changes</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.approveButton}
          onPress={handleApprove}
        >
          <Text style={styles.approveButtonText}>
            ✓ Approve & Release ${milestone.amount}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Funds will be immediately transferred to contractor upon approval
        </Text>
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
  },
  helpIcon: {
    fontSize: 24,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  milestoneName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  milestoneAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  metaInfo: {
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  contractorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
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
  messageButton: {
    fontSize: 24,
    padding: 10,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
  },
  photoWrapper: {
    marginRight: 15,
    position: 'relative',
  },
  photo: {
    width: 250,
    height: 180,
    borderRadius: 10,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 32,
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checklistIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#666',
  },
  checklistText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 15,
  },
  questionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  questionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  changesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  changesIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#FF5722',
  },
  changesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF5722',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
});

export default ReviewMilestoneScreen;