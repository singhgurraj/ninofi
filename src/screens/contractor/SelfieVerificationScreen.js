/**
 * SelfieVerificationScreen - Capture/submit contractor selfie for ID verification.
 * Shares similar UX with document upload but uses the front camera + 1:1 crop hints.
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
 * @param {{ navigation: any }} props React Navigation stack props.
 */
const SelfieVerificationScreen = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);

  // Permissions mirror DocumentUpload but we bias messaging toward selfies
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Allow camera access to capture your selfie.'
      );
      return false;
    }
    return true;
  };

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'Allow access to select an existing selfie.'
      );
      return false;
    }
    return true;
  };

  // Launch front camera with square aspect to center the face for ID match
  const takeSelfie = async () => {
    const permitted = await requestCameraPermission();
    if (!permitted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled) {
      setImageUri(result.assets?.[0]?.uri || null);
    }
  };

  // Gallery selector allows using a previously-captured selfie if quality is good
  const chooseFromGallery = async () => {
    const permitted = await requestMediaPermission();
    if (!permitted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled) {
      setImageUri(result.assets?.[0]?.uri || null);
    }
  };

  const handleRetake = () => setImageUri(null);

  // Placeholder success flow; backend integration would upload and await review
  const handleConfirm = () => {
    if (!imageUri) {
      Alert.alert('Selfie Required', 'Capture or select a selfie first.');
      return;
    }

    Alert.alert('Selfie Submitted', 'Selfie submitted successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const instructions = [
    'Position your face in the frame',
    'Remove glasses or hats if possible',
    'Ensure good, even lighting',
    'Face the camera directly',
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* ScrollView used to keep layout responsive with safe-area padding */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Verify Your Identity</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Selfie tips</Text>
          {instructions.map((text, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.instructionIcon}>•</Text>
              <Text style={styles.instructionText}>{text}</Text>
            </View>
          ))}
        </View>

        {!imageUri ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={takeSelfie}>
              <Text style={styles.buttonIcon}>📸</Text>
              <Text style={styles.buttonText}>Take Selfie</Text>
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
    aspectRatio: 1,
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

export default SelfieVerificationScreen;
