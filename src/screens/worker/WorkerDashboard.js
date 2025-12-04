import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import palette from '../../styles/palette';
import { loadNotifications } from '../../services/notifications';
import { markAllRead } from '../../store/notificationSlice';

const WorkerDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items: notifications } = useSelector((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mock data
  const stats = {
    earnings: 1250,
    completedGigs: 8,
    rating: 4.6,
  };

  const availableGigs = [
    {
      id: '1',
      title: 'Help with Demolition',
      contractor: 'Mike Johnson',
      location: 'Downtown',
      duration: '1 day',
      pay: 150,
      distance: '1.2 miles',
    },
    {
      id: '2',
      title: 'Painting Assistant',
      contractor: 'Sarah Chen',
      location: 'Westside',
      duration: '2 days',
      pay: 280,
      distance: '3.5 miles',
    },
  ];

  const fetchNotifs = useCallback(async () => {
    if (!user?.id) return;
    try {
      await loadNotifications(user.id)(dispatch);
      dispatch(markAllRead());
    } catch {
      // no-op
    }
  }, [dispatch, user?.id]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifs();
    }, [fetchNotifs])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.fullName || 'Worker'}!</Text>
            <Text style={styles.role}>Ready to work?</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${stats.earnings}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedGigs}</Text>
            <Text style={styles.statLabel}>Completed Gigs</Text>
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
      onPress={() => console.log('Browse Gigs - Coming soon')}
    >
      <Text style={styles.actionIcon}>🔍</Text>
      <Text style={styles.actionText}>Browse Gigs</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={styles.actionButtonOutline}
      onPress={() => console.log('My Gigs - Coming soon')}
    >
      <Text style={styles.actionIconOutline}>📋</Text>
      <Text style={styles.actionTextOutline}>My Gigs</Text>
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

        {/* Available Gigs Nearby */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Gigs Nearby</Text>
            <TouchableOpacity onPress={() => console.log('View All - Coming soon')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {availableGigs.map((gig) => (
            <TouchableOpacity 
              key={gig.id}
              style={styles.gigCard}
              onPress={() => console.log('Gig Details - Coming soon', gig.title)}
            >
              <View style={styles.gigHeader}>
                <Text style={styles.gigTitle}>{gig.title}</Text>
                <Text style={styles.gigPay}>${gig.pay}</Text>
              </View>
              
              <Text style={styles.gigContractor}>
                Posted by {gig.contractor}
              </Text>
              
              <View style={styles.gigDetails}>
                <View style={styles.gigDetail}>
                  <Text style={styles.gigDetailIcon}>📍</Text>
                  <Text style={styles.gigDetailText}>
                    {gig.location} • {gig.distance}
                  </Text>
                </View>
                
                <View style={styles.gigDetail}>
                  <Text style={styles.gigDetailIcon}>⏱️</Text>
                  <Text style={styles.gigDetailText}>{gig.duration}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => console.log('Apply to gig - Coming soon')}
              >
                <Text style={styles.applyButtonText}>Apply Now</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Gigs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Current Gigs</Text>
          
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateText}>No active gigs</Text>
            <Text style={styles.emptyStateSubtext}>
              Apply for gigs to get started
            </Text>
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
  },
  notificationIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
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
  gigCard: {
    backgroundColor: palette.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: palette.border,
  },
  gigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gigTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    color: palette.text,
  },
  gigPay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#41C87A',
  },
  gigContractor: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 15,
  },
  gigDetails: {
    marginBottom: 15,
  },
  gigDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gigDetailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  gigDetailText: {
    fontSize: 14,
    color: palette.muted,
  },
  applyButton: {
    backgroundColor: palette.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: palette.text,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: palette.muted,
  },
});

export default WorkerDashboard;
