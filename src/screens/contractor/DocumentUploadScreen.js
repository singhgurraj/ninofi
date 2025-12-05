/**
 * DocumentUploadScreen - Handles contractor document capture/selection.
 * Uses expo-image-picker to either open the camera or the media library, guiding the user with tips.
 */
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import palette from '../../styles/palette';

/**
 * @param {{ route: any, navigation: any }} props Navigation props injected by React Navigation.
 */
const DocumentUploadScreen = ({ route, navigation }) => {
  const { documentType = 'Document' } = route.params || {};
  const [imageUri, setImageUri] = useState(null);

  // Ask for camera access; expo-image-picker handles permission prompts per platform
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Allow camera access to capture your document.'
      );
      return false;
    }
    return true;
  };

  // Ask for photo library access so the user can pull existing scans
  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'Allow access to your photo library to choose a document photo.'
      );
      return false;
    }
    return true;
  };

  // Launch camera with light editing to help straighten documents
  const takePhoto = async () => {
    const permitted = await requestCameraPermission();
    if (!permitted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled) {
      setImageUri(result.assets?.[0]?.uri || null);
    }
  };

  // Let the contractor pick from camera roll; consistent quality settings with capture flow
  const chooseFromGallery = async () => {
    const permitted = await requestMediaPermission();
    if (!permitted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled) {
      setImageUri(result.assets?.[0]?.uri || null);
    }
  };

  // Reset selection so the user can re-shoot or re-select
  const handleRetake = () => setImageUri(null);

  // Simple optimistic confirmation; real implementation would upload to backend
  const handleConfirm = () => {
    if (!imageUri) {
      Alert.alert('Upload Required', 'Please capture or select your document first.');
      return;
    }

    Alert.alert(
      'Document Uploaded',
      `${documentType} submitted successfully!`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const instructions = [
    'Ensure document is clear and readable',
    'All corners are visible in the frame',
    'Avoid glare, reflections, or shadows',
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* ScrollView prevents keyboard overlap and keeps layout consistent on smaller devices */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{documentType}</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Upload tips</Text>
          {instructions.map((text, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.instructionIcon}>•</Text>
              <Text style={styles.instructionText}>{text}</Text>
            </View>
          ))}
        </View>

        {!imageUri ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
              <Text style={styles.buttonIcon}>📷</Text>
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={chooseFromGallery}>
              <Text style={styles.buttonIcon}>🖼️</Text>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.previewCard}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Confirm & Submit</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: palette.text,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: palette.text,
  },
  instructionsCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#3B2A68',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: palette.text,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  instructionIcon: {
    fontSize: 16,
    color: palette.primary,
    marginRight: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: palette.text,
  },
  previewCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#3B2A68',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: palette.surface,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  retakeText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: palette.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DocumentUploadScreen;
