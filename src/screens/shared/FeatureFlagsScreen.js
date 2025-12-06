import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { featureFlagsAPI } from '../../services/api';

const FeatureFlagsScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [flags, setFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadFlags = useCallback(
    async (opts = { refreshing: false }) => {
      if (opts.refreshing) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const res = await featureFlagsAPI.getAllFlags();
        setFlags(res.data || []);
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load feature flags');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleToggle = async (flag) => {
    try {
      const nextValue = !flag.enabled;
      await featureFlagsAPI.toggleFlag(flag.featureName, nextValue, flag.description);
      setFlags((prev) =>
        prev.map((item) =>
          item.featureName === flag.featureName ? { ...item, enabled: nextValue } : item
        )
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update flag');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFlags({ refreshing: true })} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Feature Flags</Text>
        {isLoading && <Text style={styles.muted}>Loading flags...</Text>}
        {!isLoading && flags.length === 0 ? (
          <Text style={styles.muted}>No feature flags found.</Text>
        ) : (
          flags.map((flag) => (
            <View key={flag.featureName || flag.feature_name} style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.flagName}>{flag.featureName || flag.feature_name}</Text>
                <Text style={styles.flagDescription}>{flag.description || 'No description.'}</Text>
              </View>
              <Switch
                value={!!flag.enabled}
                onValueChange={() => handleToggle(flag)}
                trackColor={{ false: '#CBD5F5', true: '#86EFAC' }}
                thumbColor={flag.enabled ? '#16A34A' : '#FFFFFF'}
              />
            </View>
          ))
        )}
        <Text style={styles.caption}>
          {user?.role?.toLowerCase() === 'admin'
            ? 'Admin view'
            : 'Preview only – this screen will be admin-only later.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  cardText: { flex: 1 },
  flagName: { fontSize: 16, fontWeight: '700', color: palette.text },
  flagDescription: { color: palette.muted, marginTop: 4 },
  muted: { color: palette.muted },
  caption: { color: palette.muted, marginTop: 12, fontSize: 12 },
});

export default FeatureFlagsScreen;
