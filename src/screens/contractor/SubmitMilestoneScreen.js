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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
  },
  projectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  projectClient: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  milestoneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '600',
  },
  milestoneAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
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
    borderRadius: 8,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#666',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  checkInButtonVerified: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  checkInIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  checkInText: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    marginLeft: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  draftButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginBottom: 30,
  },
});

export default SubmitMilestoneScreen;