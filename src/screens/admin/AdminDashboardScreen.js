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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
  content: { padding: 22, gap: 16, paddingBottom: 44 },
  title: { fontSize: 26, fontWeight: '800', color: palette.text },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    flexBasis: '48%',
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    gap: 6,
  },
  cardLabel: { color: palette.muted, fontSize: 14, letterSpacing: 0.1 },
  cardValue: { color: palette.text, fontWeight: '800', fontSize: 22 },
  cardFull: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    gap: 10,
  },
  disputeRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    gap: 4,
  },
  rowTitle: { color: palette.text, fontWeight: '700', fontSize: 15 },
  muted: { color: palette.muted, fontSize: 14 },
});

export default AdminDashboardScreen;
