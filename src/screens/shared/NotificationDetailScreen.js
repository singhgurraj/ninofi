import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { decideApplication, decideApplicationByProject } from '../../services/notifications';

const NotificationDetailScreen = ({ route, navigation }) => {
  const { notification } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!notification) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Notification not found.</Text>
      </SafeAreaView>
    );
  }

  let data = notification.data || {};
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  const handleDecision = async (action) => {
    const hasProjectAndContractor = data.projectId && data.contractorId;
    const hasAppId = Boolean(data.applicationId);
    if (!hasProjectAndContractor && !hasAppId) return;
    setIsSubmitting(true);
    try {
      // Prefer the applicationId route when present to avoid stale project/contractor combos.
      if (hasAppId) {
        const payload = {
          applicationId: data.applicationId,
          action,
          ownerId: user?.id,
        };
        console.log('[decideApplication] payload', payload);
        await decideApplication(data.applicationId, action, user?.id);
      } else if (hasProjectAndContractor) {
        const payload = {
          projectId: data.projectId,
          contractorId: data.contractorId,
          ownerId: user?.id,
          action,
        };
        console.log('[decideApplicationByProject] payload', payload);
        await decideApplicationByProject(payload);
      }
      Alert.alert(
        'Updated',
        `Application ${action === 'accept' ? 'accepted' : 'denied'}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canDecide = Boolean(data.applicationId) || Boolean(data.projectId && data.contractorId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
        {data.contractorName && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contractor</Text>
            <Text style={styles.meta}>{data.contractorName}</Text>
            {data.contractorEmail ? <Text style={styles.meta}>{data.contractorEmail}</Text> : null}
            {data.contractorPhone ? <Text style={styles.meta}>{data.contractorPhone}</Text> : null}
          </View>
        )}
        {data.projectTitle && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Project</Text>
            <Text style={styles.meta}>{data.projectTitle}</Text>
          </View>
        )}
      </ScrollView>
      {canDecide && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.deny]}
            onPress={() => handleDecision('deny')}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.accept]}
            onPress={() => handleDecision('accept')}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  body: { color: palette.text, fontSize: 15, lineHeight: 22 },
  muted: { color: palette.muted, padding: 20, fontSize: 13.5 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: palette.text, marginBottom: 4 },
  meta: { color: palette.muted, marginTop: 4, fontSize: 13.5 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  accept: { backgroundColor: palette.primary },
  deny: { backgroundColor: '#EF4444' },
});

export default NotificationDetailScreen;
