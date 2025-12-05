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
  content: { padding: 20, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: palette.primary,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  muted: { color: palette.muted },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 4,
  },
  cardTitle: { fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
});

export default ComplianceScreen;
