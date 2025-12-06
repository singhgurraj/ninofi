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
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  editText: { color: palette.text, fontWeight: '700' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  muted: { color: palette.muted },
  mediaItem: { width: 160, marginRight: 10 },
  mediaImg: { width: 160, height: 120, borderRadius: 12, backgroundColor: '#eee' },
  mediaCaption: { color: palette.text, marginTop: 6 },
  reviewRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  reviewTitle: { color: palette.text, fontWeight: '700' },
});

export default PortfolioScreen;
