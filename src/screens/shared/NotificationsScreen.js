import React, { useCallback, useEffect } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { markAllRead } from '../../store/notificationSlice';
import { loadNotifications, markNotificationsRead } from '../../services/notifications';
import { projectAPI } from '../../services/api';
import palette from '../../styles/palette';

const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.notifications);

  const fetchNotifs = useCallback(async () => {
    if (user?.id) {
      try {
        await markNotificationsRead(user.id);
        dispatch(markAllRead());
      } catch {
        // no-op
      }
      dispatch(loadNotifications(user.id));
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

  const handleNotificationPress = useCallback(
    async (n) => {
      let data = n.data || {};
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = {};
        }
      }

      if (data?.type === 'message' && data.projectId && data.senderId) {
        navigation.navigate('Chat', {
          project: { id: data.projectId, title: data.projectTitle || 'Project' },
          receiver: {
            id: data.senderId,
            fullName: data.senderName || 'Sender',
            email: data.senderEmail || '',
          },
        });
        return;
      }

      if (data?.projectId) {
        try {
          const res = await projectAPI.getProjectDetails(data.projectId);
          const project = res.data;
          navigation.navigate('ProjectOverview', {
            project,
            role: (user?.role || 'homeowner').toLowerCase(),
          });
          return;
        } catch (err) {
          Alert.alert('Error', 'Could not open project from notification.');
        }
      }

      if (data?.type === 'worker-added' && data.projectId) {
        navigation.navigate('WorkerProject', { projectId: data.projectId });
        return;
      }

      navigation.navigate('NotificationDetail', { notification: n });
    },
    [navigation, user?.role]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Notifications</Text>
        {items.length === 0 && <Text style={styles.muted}>No notifications.</Text>}
        {Array.from(
          new Map(
            items.map((n, idx) => {
              const key = n.id || `local-${idx}-${Math.random().toString(36).slice(2)}`;
              return [key, n];
            })
          ).entries()
        ).map(([key, n]) => (
            <TouchableOpacity key={key} style={styles.card} onPress={() => handleNotificationPress(n)}>
              <Text style={styles.cardTitle}>{n.title}</Text>
              <Text style={styles.cardBody}>{n.body}</Text>
              {n.data?.contractorName && (
                <Text style={styles.meta}>
                  Contractor: {n.data.contractorName} ({n.data.contractorEmail || 'No email'})
                </Text>
              )}
              {n.data?.projectTitle && (
                <Text style={styles.meta}>Project: {n.data.projectTitle}</Text>
              )}
            </TouchableOpacity>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  muted: { color: palette.muted },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  cardBody: { color: palette.text, marginTop: 4 },
  meta: { color: palette.muted, marginTop: 4, fontSize: 12 },
});

export default NotificationsScreen;
