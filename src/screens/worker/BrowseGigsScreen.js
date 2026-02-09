import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';

const BrowseGigsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectAPI.listOpenGigs(user?.id);
      setGigs(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load gigs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGigs();
  }, [loadGigs]);

  const applyToGig = async (gigId) => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please log in as a worker.');
      return;
    }
    try {
      await projectAPI.applyToGig(gigId, { workerId: user.id, message: '' });
      Alert.alert('Applied', 'Your application was sent.');
      loadGigs();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to apply';
      Alert.alert('Error', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Browse Gigs</Text>
        {loading && <Text style={styles.muted}>Loading gigs…</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && gigs.length === 0 && <Text style={styles.muted}>No gigs available.</Text>}
        {gigs.map((gig) => (
          <View key={gig.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{gig.message || 'Work'}</Text>
              {gig.pay ? <Text style={styles.pay}>${Number(gig.pay || 0).toLocaleString()}</Text> : null}
            </View>
            <Text style={styles.meta}>{gig.project_title || gig.projectTitle || 'Project'}</Text>
            {gig.work_date ? <Text style={styles.meta}>Date: {gig.work_date}</Text> : null}
            {gig.tags?.length ? <Text style={styles.meta}>Tags: {gig.tags.join(', ')}</Text> : null}
            <TouchableOpacity style={styles.applyButton} onPress={() => applyToGig(gig.id)}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', color: palette.text, flex: 1 },
  pay: { color: palette.primary, fontWeight: '700' },
  meta: { color: palette.muted, fontSize: 12 },
  applyButton: {
    marginTop: 8,
    backgroundColor: palette.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyText: { color: '#fff', fontWeight: '700' },
});

export default BrowseGigsScreen;
