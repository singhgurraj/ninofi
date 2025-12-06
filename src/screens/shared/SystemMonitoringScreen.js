import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import palette from '../../styles/palette';
import api from '../../services/api';

const statusColors = {
  ok: '#16A34A',
  degraded: '#FBBF24',
  error: '#DC2626',
};

const SystemMonitoringScreen = () => {
  const navigation = useNavigation();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);

  const loadStats = useCallback(
    async (opts = { refreshing: false }) => {
      if (opts.refreshing) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const res = await api.get('/monitoring/health');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to load monitoring stats', error);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadStats();
    intervalRef.current = setInterval(() => {
      loadStats();
    }, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadStats]);

  const currentStatus = stats?.status || 'degraded';
  const statusColor = statusColors[currentStatus] || statusColors.degraded;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Monitoring</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStats({ refreshing: true })} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { borderColor: statusColor }]}>
          <Text style={styles.heroTitle}>System Status</Text>
          <Text style={[styles.heroStatus, { color: statusColor }]}>{(stats?.status || 'degraded').toUpperCase()}</Text>
          <Text style={styles.heroSubtitle}>{stats?.timestamp || 'Last updated just now'}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Uptime</Text>
            <Text style={styles.statValue}>{stats?.uptimeSeconds ? `${stats.uptimeSeconds}s` : '–'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Memory</Text>
            <Text style={styles.statValue}>{stats?.memoryMB ? `${stats.memoryMB} MB` : '–'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Requests</Text>
            <Text style={styles.statValue}>{stats?.requestCount ?? '–'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Errors</Text>
            <Text style={styles.statValue}>{stats?.errorCount ?? '–'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg Response</Text>
            <Text style={styles.statValue}>
              {stats?.averageResponseTimeMs !== undefined
                ? `${stats.averageResponseTimeMs} ms`
                : '–'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Node</Text>
            <Text style={styles.statValue}>{stats?.nodeVersion || '–'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Database</Text>
          <View style={styles.dbStatusRow}>
            <Text style={styles.dbStatusLabel}>Status</Text>
            <Text style={[styles.dbStatusValue, { color: statusColors[stats?.db?.status] || palette.text }]}>
              {(stats?.db?.status || 'unknown').toUpperCase()}
            </Text>
          </View>
          <View style={styles.dbStatusRow}>
            <Text style={styles.dbStatusLabel}>Latency</Text>
            <Text style={styles.dbStatusValue}>
              {stats?.db?.latencyMs !== null && stats?.db?.latencyMs !== undefined
                ? `${stats.db.latencyMs} ms`
                : '–'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  content: { padding: 20, gap: 12 },
  heroCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    backgroundColor: palette.surface,
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  heroStatus: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  heroSubtitle: { color: palette.muted, marginTop: 6 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '47%',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statLabel: { color: palette.muted, fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: '700', color: palette.text, marginTop: 6 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: palette.text, marginBottom: 8 },
  dbStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  dbStatusLabel: { color: palette.muted },
  dbStatusValue: { color: palette.text, fontWeight: '600' },
});

export default SystemMonitoringScreen;
