import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import palette from '../../styles/palette';
import { getProjectDetails, loadContractorApplications, withdrawApplication } from '../../services/projects';

const ApplicationsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchApps = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await loadContractorApplications(user.id);
      const pendingOnly = (res.data || []).filter((app) => app.status === 'pending');
      setApplications(pendingOnly);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleWithdraw = async (applicationId, projectId) => {
    try {
      Alert.alert(
        'Withdraw Application',
        'Are you sure you want to withdraw? This will reopen the job in Find Jobs.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            style: 'destructive',
            onPress: async () => {
              await dispatch(withdrawApplication(applicationId, projectId, user?.id));
              fetchApps();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to withdraw application');
    }
  };

  const handleView = async (projectId) => {
    if (!projectId) return;
    try {
      const res = await getProjectDetails(projectId);
      navigation.navigate('ContractorProjectDetails', {
        project: res.data,
        canApply: false,
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load project details');
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
          <TouchableOpacity key={app.id} style={styles.card} onPress={() => handleView(app.projectId)}>
            <Text style={styles.cardTitle}>{app.projectTitle || 'Project'}</Text>
            <Text style={styles.meta}>Status: {app.status}</Text>
            {app.estimatedBudget !== undefined && app.estimatedBudget !== null && (
              <Text style={styles.meta}>
                Budget: ${Number(app.estimatedBudget || 0).toLocaleString()}
              </Text>
            )}
            {app.projectAddress ? <Text style={styles.meta}>{app.projectAddress}</Text> : null}
            {app.message ? <Text style={styles.meta}>Note: {app.message}</Text> : null}
            <Text style={styles.meta}>Owner: {app.owner?.fullName || app.owner_full_name || ''}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.withdraw]}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleWithdraw(app.id, app.projectId);
              }}
              disabled={app.status !== 'pending'}
            >
              <Text style={styles.buttonText}>Withdraw</Text>
            </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
