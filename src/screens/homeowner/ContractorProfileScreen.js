import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import palette from '../../styles/palette';
import { fetchContractorProfile } from '../../services/contractors';

const ContractorProfileScreen = ({ route, navigation }) => {
  const { contractorId } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!contractorId) return;
      setLoading(true);
      const res = await fetchContractorProfile(contractorId);
      if (res.success) setProfile(res.data);
      setLoading(false);
    })();
  }, [contractorId]);

  if (!contractorId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Contractor not specified.</Text>
      </SafeAreaView>
    );
  }

  const portfolio = profile?.portfolio;
  const reviews = profile?.reviews || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={palette.primary} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.name}>{profile?.fullName || 'Contractor'}</Text>
              <Text style={styles.meta}>{portfolio?.serviceArea || 'No location'}</Text>
              <Text style={styles.meta}>
                {portfolio?.specialties?.join(', ') || 'No specialties'}
              </Text>
              <Text style={styles.meta}>
                Rate: {portfolio?.hourlyRate ? `$${portfolio.hourlyRate}/hr` : 'Not set'}
              </Text>
              {profile?.avgRating ? (
                <Text style={styles.meta}>Rating: {profile.avgRating} ({profile.reviewCount || 0})</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Portfolio</Text>
              <Text style={styles.meta}>{portfolio?.bio || 'No bio yet.'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 10 }}>
                {portfolio?.media?.length ? (
                  portfolio.media.map((m) => (
                    <View key={m.id} style={styles.mediaItem}>
                      <Image source={{ uri: m.url }} style={styles.mediaImg} />
                      {m.caption ? <Text style={styles.mediaCaption}>{m.caption}</Text> : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>No photos.</Text>
                )}
              </ScrollView>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reviews</Text>
              {reviews.length === 0 ? (
                <Text style={styles.muted}>No reviews yet.</Text>
              ) : (
                reviews.map((r) => (
                  <View key={r.id} style={styles.reviewRow}>
                    <Text style={styles.reviewTitle}>
                      {r.ratingOverall} ⭐ • {new Date(r.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.meta}>{r.comment || 'No comment'}</Text>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                navigation.navigate('Chat', {
                  project: null,
                  contractorId,
                  contractorName: profile?.fullName,
                })
              }
            >
              <Text style={styles.primaryText}>Message Contractor</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  name: { fontSize: 20, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  muted: { color: palette.muted },
  cardTitle: { fontWeight: '700', color: palette.text, fontSize: 16 },
  mediaItem: { width: 160, marginRight: 10 },
  mediaImg: { width: 160, height: 120, borderRadius: 12, backgroundColor: '#eee' },
  mediaCaption: { color: palette.text, marginTop: 4 },
  reviewRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  reviewTitle: { color: palette.text, fontWeight: '700' },
  primaryButton: {
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
});

export default ContractorProfileScreen;
