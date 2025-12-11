import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { fetchAuditLogs } from '../../services/audit';

const AuditLogScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      const res = await fetchAuditLogs({ actorId: user.id, limit: 100 });
      if (res.success) setLogs(res.data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Activity</Text>
        {loading ? (
          <ActivityIndicator color={palette.primary} />
        ) : logs.length === 0 ? (
          <Text style={styles.muted}>No recent activity.</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.row}>
              <Text style={styles.action}>{log.action}</Text>
              <Text style={styles.meta}>
                {log.entityType || 'item'} {log.entityId || ''} •{' '}
                {new Date(log.createdAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  action: { color: palette.text, fontWeight: '800', fontSize: 15 },
  meta: { color: palette.muted, fontSize: 13.5, marginTop: 2 },
  muted: { color: palette.muted, fontSize: 13.5 },
});

export default AuditLogScreen;
