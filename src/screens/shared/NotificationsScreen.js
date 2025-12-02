import React, { useCallback, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { clearNotifications } from '../../store/notificationSlice';
import { loadNotifications } from '../../services/notifications';
import palette from '../../styles/palette';

const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.notifications);

  const fetchNotifs = useCallback(() => {
    if (user?.id) {
      dispatch(clearNotifications());
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Notifications</Text>
        {items.length === 0 && <Text style={styles.muted}>No notifications.</Text>}
        {Array.from(new Map(items.map((n, idx) => [n.id || `local-${idx}`, n])).entries()).map(
          ([key, n]) => (
            <TouchableOpacity
              key={key}
              style={styles.card}
              onPress={() => navigation.navigate('NotificationDetail', { notification: n })}
            >
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
