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
import palette from '../../styles/palette';

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
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: palette.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  helpIcon: {
    fontSize: 22,
    color: palette.muted,
    width: 40,
    textAlign: 'center',
  },
  milestoneCard: {
    backgroundColor: palette.surface,
    padding: 20,
    margin: 20,
    marginTop: 12,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  milestoneName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    color: palette.text,
  },
  milestoneAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.primary,
    marginBottom: 10,
  },
  metaInfo: {
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 2,
  },
  contractorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    color: palette.text,
  },
  contractorRating: {
    fontSize: 14,
    color: palette.muted,
  },
  messageButton: {
    fontSize: 22,
    padding: 10,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    color: palette.text,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  photoWrapper: {
    marginRight: 15,
    position: 'relative',
  },
  photo: {
    width: 240,
    height: 170,
    borderRadius: 14,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 28,
    color: '#fff',
  },
  checklistCard: {
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checklistIcon: {
    fontSize: 18,
    marginRight: 12,
    color: palette.muted,
  },
  checklistText: {
    fontSize: 15,
    color: palette.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 15,
  },
  questionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  questionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  changesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF5722',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  changesIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#FF5722',
  },
  changesText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF5722',
  },
  approveButton: {
    backgroundColor: '#51CF66',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  note: {
    textAlign: 'center',
    fontSize: 13,
    color: palette.muted,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
});

export default ReviewMilestoneScreen;
