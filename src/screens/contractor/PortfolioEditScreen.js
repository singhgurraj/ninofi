import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { fetchPortfolio, savePortfolio } from '../../services/portfolio';

const PortfolioEditScreen = ({ route, navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    title: '',
    bio: '',
    specialties: '',
    hourlyRate: '',
    serviceArea: '',
  });
  const [media, setMedia] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const res = await fetchPortfolio(user.id);
      if (res.success && res.data) {
        const p = res.data;
        setForm({
          title: p.title || '',
          bio: p.bio || '',
          specialties: p.specialties?.join(', ') || '',
          hourlyRate: p.hourlyRate ? String(p.hourlyRate) : '',
          serviceArea: p.serviceArea || '',
        });
        setMedia(p.media || []);
      }
    })();
  }, [user?.id]);

  const pickImage = async () => {
    const permitted = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permitted.status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to pick photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    setMedia((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        url: asset.uri,
        fileUri: asset.uri,
        type: 'general',
        caption: '',
        mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
      },
    ]);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const payload = {
      contractorId: user.id,
      title: form.title,
      bio: form.bio,
      specialties: form.specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
      serviceArea: form.serviceArea,
      media,
    };
    const res = await savePortfolio(payload);
    setSaving(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to save portfolio');
      return;
    }
    Alert.alert('Saved', 'Portfolio updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Edit Portfolio</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Headline</Text>
          <TextInput
            value={form.title}
            onChangeText={(title) => setForm((s) => ({ ...s, title }))}
            style={styles.input}
            placeholder="e.g. Licensed GC • Kitchens & Baths"
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={form.bio}
            onChangeText={(bio) => setForm((s) => ({ ...s, bio }))}
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Share your expertise, years in business, insurance, licenses."
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.label}>Specialties (comma separated)</Text>
          <TextInput
            value={form.specialties}
            onChangeText={(specialties) => setForm((s) => ({ ...s, specialties }))}
            style={styles.input}
            placeholder="kitchen remodel, tiling, roofing"
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.label}>Hourly rate</Text>
          <TextInput
            value={form.hourlyRate}
            onChangeText={(hourlyRate) => setForm((s) => ({ ...s, hourlyRate }))}
            style={styles.input}
            keyboardType="numeric"
            placeholder="$"
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.label}>Service area</Text>
          <TextInput
            value={form.serviceArea}
            onChangeText={(serviceArea) => setForm((s) => ({ ...s, serviceArea }))}
            style={styles.input}
            placeholder="City or counties served"
            placeholderTextColor={palette.muted}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.galleryHeader}>
            <Text style={styles.cardTitle}>Gallery</Text>
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.primaryText}>+ Add photo</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 10 }}>
            {media.length ? (
              media.map((m) => (
                <View key={m.id} style={styles.mediaItem}>
                  <Image source={{ uri: m.url }} style={styles.mediaImg} />
                </View>
              ))
            ) : (
              <Text style={styles.muted}>No photos yet.</Text>
            )}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Portfolio'}</Text>
        </TouchableOpacity>
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
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  primaryText: { color: palette.primary, fontWeight: '700' },
  muted: { color: palette.muted },
  mediaItem: { width: 140, marginRight: 10 },
  mediaImg: { width: 140, height: 110, borderRadius: 12, backgroundColor: '#eee' },
  primaryButton: {
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});

export default PortfolioEditScreen;
