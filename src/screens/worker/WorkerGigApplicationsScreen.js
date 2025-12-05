import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';

const WorkerGigApplicationsScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectAPI.listGigApplications(user.id);
      setItems(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async (applicationId) => {
    try {
      await projectAPI.withdrawGigApplication(applicationId, { workerId: user.id });
      Alert.alert('Withdrawn', 'Your application was withdrawn.');
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to withdraw');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Applications</Text>
        {loading && <Text style={styles.muted}>Loading…</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && items.length === 0 && <Text style={styles.muted}>No applications yet.</Text>}
        {items.map((app) => (
          <View key={app.id} style={styles.card}>
            <Text style={styles.cardTitle}>{app.project_title || 'Project'}</Text>
            {app.work_date ? <Text style={styles.meta}>Date: {app.work_date}</Text> : null}
            {app.pay ? <Text style={styles.meta}>Pay: ${Number(app.pay || 0).toLocaleString()}</Text> : null}
            <Text style={styles.meta}>Status: {(app.status || 'pending').toUpperCase()}</Text>
            {app.status === 'pending' && (
              <TouchableOpacity style={styles.withdrawButton} onPress={() => withdraw(app.id)}>
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            )}
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
  error: { color: '#c1121f' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 6,
  },
  cardTitle: { fontWeight: '700', color: palette.text },
  meta: { color: palette.muted, fontSize: 12 },
  withdrawButton: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    backgroundColor: palette.surface,
  },
  withdrawText: { color: '#c1121f', fontWeight: '700' },
});

export default WorkerGigApplicationsScreen;
