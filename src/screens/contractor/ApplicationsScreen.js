import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { loadContractorApplications, withdrawApplication } from '../../services/projects';

const ApplicationsScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchApps = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await loadContractorApplications(user.id);
      setApplications(res.data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleWithdraw = async (applicationId) => {
    try {
      await withdrawApplication(applicationId, user?.id);
      fetchApps();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to withdraw application');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Applications</Text>
        {loading && <Text style={styles.muted}>Loading…</Text>}
        {!loading && applications.length === 0 && (
          <Text style={styles.muted}>No applications yet.</Text>
        )}
        {applications.map((app) => (
          <View key={app.id} style={styles.card}>
            <Text style={styles.cardTitle}>{app.projectTitle || 'Project'}</Text>
            <Text style={styles.meta}>Status: {app.status}</Text>
            {app.message ? <Text style={styles.meta}>Note: {app.message}</Text> : null}
            <Text style={styles.meta}>Owner: {app.owner?.fullName || app.owner_full_name || ''}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.withdraw]}
                onPress={() => handleWithdraw(app.id)}
                disabled={app.status !== 'pending'}
              >
                <Text style={styles.buttonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  cardTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 10 },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  withdraw: { backgroundColor: '#FEE2E2' },
  buttonText: { color: '#B91C1C', fontWeight: '700' },
});

export default ApplicationsScreen;
