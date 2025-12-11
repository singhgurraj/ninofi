import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { fetchCompliance, uploadCompliance } from '../../services/compliance';

const ComplianceScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDocs = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await fetchCompliance(user.id);
    if (res.success) setDocs(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, [user?.id]);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      const asset = result?.assets?.[0] || result;
      if (result.type === 'cancel' || asset?.canceled) return;

      const res = await uploadCompliance({
        userId: user.id,
        type: 'license',
        fileUri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType,
      });
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to upload document');
        return;
      }
      Alert.alert('Uploaded', 'Document saved.');
      loadDocs();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick file');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Compliance</Text>
          <TouchableOpacity style={styles.button} onPress={handleUpload}>
            <Text style={styles.buttonText}>Upload</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : docs.length === 0 ? (
          <Text style={styles.muted}>No documents uploaded.</Text>
        ) : (
          docs.map((d) => (
            <View key={d.id} style={styles.card}>
              <Text style={styles.cardTitle}>{d.type}</Text>
              <Text style={styles.meta}>Status: {d.status}</Text>
              {d.expiresAt ? (
                <Text style={styles.meta}>
                  Expires: {new Date(d.expiresAt).toLocaleDateString()}
                </Text>
              ) : null}
              <Text style={styles.meta}>{d.url}</Text>
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
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: palette.primary,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  muted: { color: palette.muted, fontSize: 13.5 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 6,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: { fontWeight: '800', color: palette.text, fontSize: 16 },
  meta: { color: palette.muted, fontSize: 13.5 },
});

export default ComplianceScreen;
