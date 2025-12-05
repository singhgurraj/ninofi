import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import palette from '../../styles/palette';
import { searchContractors } from '../../services/contractors';

const ContractorSearchScreen = ({ navigation }) => {
  const [filters, setFilters] = useState({
    specialty: '',
    ratingMin: '',
    serviceArea: '',
    priceMin: '',
    priceMax: '',
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const res = await searchContractors(filters);
    if (res.success) {
      setResults(res.data || []);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Find Contractors</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Specialty</Text>
          <TextInput
            style={styles.input}
            placeholder="kitchen, roofing, tiling"
            placeholderTextColor={palette.muted}
            value={filters.specialty}
            onChangeText={(specialty) => setFilters((s) => ({ ...s, specialty }))}
          />
          <Text style={styles.label}>Min rating</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 4"
            placeholderTextColor={palette.muted}
            keyboardType="numeric"
            value={filters.ratingMin}
            onChangeText={(ratingMin) => setFilters((s) => ({ ...s, ratingMin }))}
          />
          <Text style={styles.label}>Service area</Text>
          <TextInput
            style={styles.input}
            placeholder="City or region"
            placeholderTextColor={palette.muted}
            value={filters.serviceArea}
            onChangeText={(serviceArea) => setFilters((s) => ({ ...s, serviceArea }))}
          />
          <Text style={styles.label}>Rate range ($/hr)</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Min"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              value={filters.priceMin}
              onChangeText={(priceMin) => setFilters((s) => ({ ...s, priceMin }))}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Max"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              value={filters.priceMax}
              onChangeText={(priceMax) => setFilters((s) => ({ ...s, priceMax }))}
            />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSearch} disabled={loading}>
            <Text style={styles.primaryText}>{loading ? 'Searching…' : 'Search'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Results</Text>
          {loading ? (
            <ActivityIndicator color={palette.primary} />
          ) : results.length === 0 ? (
            <Text style={styles.muted}>No contractors yet.</Text>
          ) : (
            results.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.resultRow}
                onPress={() => navigation.navigate('ContractorProfile', { contractorId: c.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{c.fullName || 'Contractor'}</Text>
                  <Text style={styles.meta}>
                    {c.serviceArea || 'No location'} • {c.specialties?.join(', ') || 'No specialties'}
                  </Text>
                  <Text style={styles.meta}>
                    Rate: {c.hourlyRate ? `$${c.hourlyRate}/hr` : 'N/A'} • Rating: {c.avgRating || 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  label: { color: palette.text, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    color: palette.text,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  primaryButton: {
    backgroundColor: palette.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  muted: { color: palette.muted },
  resultRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  resultName: { fontWeight: '700', color: palette.text },
  meta: { color: palette.muted, marginTop: 2 },
});

export default ContractorSearchScreen;
