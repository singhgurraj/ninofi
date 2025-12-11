import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import palette from '../../styles/palette';

const ScanOrUploadInvoiceScreen = ({ navigation, route }) => {
  const { draftInvoice } = route?.params || {};
  const [fileUri, setFileUri] = useState(null);
  const [fileName, setFileName] = useState(null);

  const setFile = (uri) => {
    setFileUri(uri);
    const parts = uri.split('/');
    setFileName(parts[parts.length - 1]);
  };

  const requestCameraPermissions = async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan invoices.');
      return false;
    }
    return true;
  };

  const scanWithCamera = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setFile(result.assets[0].uri);
    }
  };

  const uploadFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      setFile(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (!fileUri) {
      Alert.alert('Add a file', 'Scan or upload an invoice to continue.');
      return;
    }

    const now = new Date().toISOString();
    const composedDraft = {
      ...(draftInvoice || {}),
      id: (draftInvoice && draftInvoice.id) || `draft-${Date.now()}`,
      vendorName: draftInvoice?.vendorName || '',
      invoiceNumber: draftInvoice?.invoiceNumber || '',
      amount: draftInvoice?.amount || 0,
      taxAmount: draftInvoice?.taxAmount || 0,
      totalAmount:
        draftInvoice?.totalAmount ||
        (draftInvoice?.amount || 0) + (draftInvoice?.taxAmount || 0),
      currency: 'USD',
      issueDate: draftInvoice?.issueDate || now,
      dueDate: draftInvoice?.dueDate || null,
      projectId: draftInvoice?.projectId || null,
      projectName: draftInvoice?.projectName || null,
      category: draftInvoice?.category || 'materials',
      status: draftInvoice?.status || 'unassigned',
      notes: draftInvoice?.notes || '',
      fileUri,
      thumbnailUri: fileUri,
      createdAt: draftInvoice?.createdAt || now,
      updatedAt: now,
      fileName,
    };

    navigation.navigate('InvoiceEdit', {
      invoiceId: composedDraft.id,
      draftInvoice: composedDraft,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Scan or upload invoice</Text>
        <Text style={styles.subtitle}>
          Capture with your camera or upload from your device. We will store it in the cloud for you.
        </Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.card} onPress={scanWithCamera}>
            <Text style={styles.cardIcon}>📷</Text>
            <Text style={styles.cardTitle}>Scan with Camera</Text>
            <Text style={styles.cardText}>Take a clear photo of the invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={uploadFromLibrary}>
            <Text style={styles.cardIcon}>🗂️</Text>
            <Text style={styles.cardTitle}>Upload from Library</Text>
            <Text style={styles.cardText}>Pick an existing photo or PDF</Text>
          </TouchableOpacity>
        </View>

        {fileUri && (
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Image source={{ uri: fileUri }} style={styles.previewImage} />
            {fileName && <Text style={styles.previewName}>{fileName}</Text>}
          </View>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryText}>Continue to details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.text,
  },
  subtitle: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 13.5,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  card: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardIcon: {
    fontSize: 26,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  cardText: {
    color: palette.muted,
    marginTop: 6,
    fontSize: 13.5,
  },
  preview: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  previewLabel: {
    fontWeight: '700',
    color: palette.text,
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 10,
  },
  previewName: {
    color: palette.muted,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default ScanOrUploadInvoiceScreen;
