import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import palette from '../../styles/palette';
import { fetchAdminAnalytics, fetchAdminDisputes } from '../../services/admin';

const AdminDashboardScreen = () => {
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    users: 0,
    disputesOpen: 0,
    contractors: 0,
  });
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    (async () => {
      const m = await fetchAdminAnalytics();
      if (m.success && m.data) setMetrics(m.data);
      const d = await fetchAdminDisputes();
      if (d.success) setDisputes(d.data || []);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.cardRow}>
          {[
            ['Active Projects', metrics.activeProjects],
            ['Users', metrics.users],
            ['Contractors', metrics.contractors],
            ['Open Disputes', metrics.disputesOpen],
          ].map(([label, value]) => (
            <View key={label} style={styles.card}>
              <Text style={styles.cardLabel}>{label}</Text>
              <Text style={styles.cardValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFull}>
          <Text style={styles.cardLabel}>Disputes</Text>
          {disputes.length === 0 ? (
            <Text style={styles.muted}>No disputes.</Text>
          ) : (
            disputes.map((d) => (
              <View key={d.id} style={styles.disputeRow}>
                <Text style={styles.rowTitle}>
                  {d.status} • {d.priority || 'normal'}
                </Text>
                <Text style={styles.muted}>{d.description || 'No details'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexBasis: '48%',
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardLabel: { color: palette.muted },
  cardValue: { color: palette.text, fontWeight: '700', fontSize: 18 },
  cardFull: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  disputeRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  rowTitle: { color: palette.text, fontWeight: '700' },
  muted: { color: palette.muted },
});

export default AdminDashboardScreen;
