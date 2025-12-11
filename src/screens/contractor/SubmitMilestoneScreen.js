import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import palette from '../../styles/palette';

const SubmitMilestoneScreen = ({ route, navigation }) => {
  const { project, milestone } = route.params || {
    project: { title: 'Kitchen Renovation', client: 'Sarah Wilson' },
    milestone: { name: 'Plumbing Installation', amount: 3000 }
  };

  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [locationVerified, setLocationVerified] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(asset => asset.uri);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const checkInLocation = () => {
    // Mock location check
    setLocationVerified(true);
    Alert.alert('Success', 'Location verified at job site');
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please add a description of the work completed');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Photos Required', 'Please add at least one photo of the completed work');
      return;
    }

    Alert.alert(
      'Submit Milestone',
      'Submit this milestone for homeowner approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            Alert.alert('Success', 'Milestone submitted! Awaiting homeowner approval.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Milestone</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Project Info */}
        <View style={styles.projectCard}>
          <Text style={styles.projectTitle}>{project.title}</Text>
          <Text style={styles.projectClient}>{project.client}</Text>
          <View style={styles.milestoneInfo}>
            <Text style={styles.milestoneName}>{milestone.name}</Text>
            <Text style={styles.milestoneAmount}>${milestone.amount}</Text>
          </View>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Completed</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the completed work in detail..."
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {/* Progress Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Photos</Text>
          <Text style={styles.sectionSubtitle}>Add photos showing the completed work</Text>
          
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {photos.length < 6 && (
              <>
                <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
                  <Text style={styles.addPhotoIcon}>📷</Text>
                  <Text style={styles.addPhotoText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickFromGallery}>
                  <Text style={styles.addPhotoIcon}>🖼️</Text>
                  <Text style={styles.addPhotoText}>Gallery</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Location Verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Verification</Text>
          <TouchableOpacity
            style={[styles.checkInButton, locationVerified && styles.checkInButtonVerified]}
            onPress={checkInLocation}
            disabled={locationVerified}
          >
            <Text style={styles.checkInIcon}>
              {locationVerified ? '✓' : '📍'}
            </Text>
            <Text style={styles.checkInText}>
              {locationVerified ? 'Checked in at job site' : 'Check in at job site'}
            </Text>
          </TouchableOpacity>
          {locationVerified && (
            <Text style={styles.locationText}>
              Location verified • Madison, WI
            </Text>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.draftButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.draftButtonText}>Save Draft</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit for Approval</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Funds will be released after homeowner approval
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: palette.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  placeholder: {
    width: 40,
  },
  projectCard: {
    backgroundColor: palette.surface,
    padding: 18,
    margin: 20,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  projectTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    color: palette.text,
  },
  projectClient: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 14,
  },
  milestoneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  milestoneAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.primary,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    color: palette.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 14,
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    color: palette.text,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  addPhotoText: {
    fontSize: 12,
    color: palette.muted,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  checkInButtonVerified: {
    backgroundColor: '#E8F5E9',
    borderColor: '#51CF66',
  },
  checkInIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  checkInText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  locationText: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 10,
    marginLeft: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  draftButton: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  draftButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  submitButton: {
    flex: 1,
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  note: {
    textAlign: 'center',
    fontSize: 13,
    color: palette.muted,
    marginBottom: 30,
  },
});

export default SubmitMilestoneScreen;
