import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { fetchPortfolio } from '../../services/portfolio';
import { fetchReviews } from '../../services/reviews';

const PortfolioScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [portfolio, setPortfolio] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      const [pRes, rRes] = await Promise.all([fetchPortfolio(user.id), fetchReviews(user.id)]);
      if (pRes.success) setPortfolio(pRes.data);
      if (rRes.success) setReviews(rRes.data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + Number(r.ratingOverall || 0), 0) / reviews.length).toFixed(1)
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Portfolio</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('PortfolioEdit', { portfolio })}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.primary} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{portfolio?.title || 'Add a headline'}</Text>
              <Text style={styles.meta}>{portfolio?.bio || 'Tell homeowners about your expertise.'}</Text>
              <Text style={styles.meta}>
                Specialties: {portfolio?.specialties?.length ? portfolio.specialties.join(', ') : 'None set'}
              </Text>
              <Text style={styles.meta}>
                Rate: {portfolio?.hourlyRate ? `$${portfolio.hourlyRate}/hr` : 'Not set'}
              </Text>
              <Text style={styles.meta}>
                Service area: {portfolio?.serviceArea || 'Not set'}
              </Text>
              {avgRating ? <Text style={styles.meta}>Avg rating: {avgRating} ⭐</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 10 }}>
                {portfolio?.media?.length ? (
                  portfolio.media.map((m) => (
                    <View key={m.id} style={styles.mediaItem}>
                      <Image source={{ uri: m.url }} style={styles.mediaImg} />
                      {m.caption ? <Text style={styles.mediaCaption}>{m.caption}</Text> : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>No photos yet.</Text>
                )}
              </ScrollView>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Reviews</Text>
              {reviews.length === 0 ? (
                <Text style={styles.muted}>No reviews yet.</Text>
              ) : (
                reviews.slice(0, 3).map((r) => (
                  <View key={r.id} style={styles.reviewRow}>
                    <Text style={styles.reviewTitle}>
                      {r.ratingOverall} ⭐ • {new Date(r.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.meta}>{r.comment || 'No comment'}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  editText: { color: palette.primary, fontWeight: '800' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: palette.text, marginBottom: 6 },
  meta: { color: palette.muted, fontSize: 14 },
  muted: { color: palette.muted },
  mediaItem: { width: 160, marginRight: 12 },
  mediaImg: { width: 160, height: 120, borderRadius: 14, backgroundColor: '#EEF2FF' },
  mediaCaption: { color: palette.text, marginTop: 6, fontSize: 13.5 },
  reviewRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
  reviewTitle: { color: palette.text, fontWeight: '800' },
});

export default PortfolioScreen;
