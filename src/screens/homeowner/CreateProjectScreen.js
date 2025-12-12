import React, { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { saveProject, removeProject } from '../../services/projects';
import palette from '../../styles/palette';

const CreateProjectScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const existingProject = route?.params?.project;
  const origin = route?.params?.origin || null;

  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState(existingProject?.projectType || '');
  const [formData, setFormData] = useState({
    title: existingProject?.title || '',
    description: existingProject?.description || '',
    estimatedBudget: existingProject?.estimatedBudget?.toString() || '',
    timeline: existingProject?.timeline || '',
    address: existingProject?.address || '',
  });
  const [jobSiteLatitude, setJobSiteLatitude] = useState(
    existingProject?.job_site_latitude ?? existingProject?.jobSiteLatitude ?? null
  );
  const [jobSiteLongitude, setJobSiteLongitude] = useState(
    existingProject?.job_site_longitude ?? existingProject?.jobSiteLongitude ?? null
  );
  const [locationVerified, setLocationVerified] = useState(
    Boolean(
      (existingProject?.job_site_latitude ?? existingProject?.jobSiteLatitude) &&
        (existingProject?.job_site_longitude ?? existingProject?.jobSiteLongitude)
    )
  );
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [milestones, setMilestones] = useState([
    ...(existingProject?.milestones?.length
      ? existingProject.milestones.map((m, idx) => ({
          name: m.name || '',
          amount: m.amount?.toString?.() || '',
          description: m.description || '',
          position: idx,
        }))
      : [{ name: '', amount: '', description: '' }]),
  ]);
  const [attachments, setAttachments] = useState(
    existingProject?.media?.length
      ? existingProject.media.map((m) => ({
          uri: m.url || '',
          dataUri: (m.url || '').startsWith('data:') ? m.url : '',
          label: m.label || '',
        }))
      : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projectTypes = [
    { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { id: 'bathroom', label: 'Bathroom', icon: '🚿' },
    { id: 'full', label: 'Full Remodel', icon: '🏠' },
    { id: 'other', label: 'Other', icon: '🔧' },
  ];

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'address') {
      setLocationVerified(false);
      setJobSiteLatitude(null);
      setJobSiteLongitude(null);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', amount: '', description: '' }]);
  };

  const removeMilestone = (index) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addAttachment = () => {
    setAttachments((prev) => [...prev, { uri: '', dataUri: '', label: '' }]);
  };

  const updateAttachment = (index, field, value) => {
    setAttachments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!formData.title || !projectType || !formData.description || !formData.estimatedBudget) {
        Alert.alert('Required', 'Please fill in all required fields');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.timeline || !formData.address) {
        Alert.alert('Required', 'Please fill in all required fields');
        return;
      }
      if (!locationVerified) {
        Alert.alert('Location not verified', 'Recommended: Verify location for GPS check-ins.', [
          { text: 'Verify now', onPress: () => verifyLocation() },
          { text: 'Continue anyway', style: 'default', onPress: () => setStep(3) },
        ]);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      handleSubmit();
    }
  };

  useEffect(() => {
    if (existingProject) {
      setStep(3);
    }
  }, [existingProject]);

  const pickAttachment = async (index = attachments.length, mode = 'library') => {
    try {
      if (mode === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission required', 'Please grant camera access to attach images.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission required', 'Please grant photo access to attach images.');
          return;
        }
      }

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({
              base64: true,
              quality: 0.7,
              allowsMultipleSelection: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              base64: true,
              quality: 0.7,
            });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      const dataUri = asset.base64
        ? `data:${asset.mimeType || asset.type || 'image/jpeg'};base64,${asset.base64}`
        : '';
      setAttachments((prev) => {
        const next = [...prev];
        if (index >= next.length) {
          next.push({
            uri: asset.uri || '',
            dataUri: dataUri || '',
            label: '',
          });
        } else {
          next[index] = {
            ...next[index],
            uri: asset.uri || '',
            dataUri: dataUri || '',
          };
        }
        return next;
      });
    } catch (err) {
      console.error('Image pick error', err);
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }

    const budgetValue = parseFloat(formData.estimatedBudget);
    const totalMilestones = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

    if (Number.isNaN(budgetValue)) {
      Alert.alert('Invalid Budget', 'Please enter a valid budget amount');
      return;
    }

    if (totalMilestones > budgetValue) {
      Alert.alert('Budget Exceeded', 'Total milestones exceed project budget');
      return;
    }

    const projectPayload = {
      id: existingProject?.id,
      userId: user.id,
      title: formData.title.trim(),
      projectType,
      description: formData.description,
      estimatedBudget: budgetValue,
      timeline: formData.timeline,
      address: formData.address,
      job_site_latitude: jobSiteLatitude,
      job_site_longitude: jobSiteLongitude,
      check_in_radius: 200,
      milestones: milestones.map((milestone, index) => ({
        name: milestone.name,
        amount: parseFloat(milestone.amount) || null,
        description: milestone.description,
        position: milestone.position ?? index,
      })),
      media: attachments
        .filter((a) => a.dataUri || a.uri)
        .map((a) => ({
          url: a.dataUri || a.uri,
          label: a.label || '',
        })),
    };

    try {
      setIsSubmitting(true);
      const result = await dispatch(saveProject(projectPayload));
      if (result?.success) {
        Alert.alert('Success', `Project ${existingProject ? 'updated' : 'created'}!`, [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate(origin === 'ProjectsList' ? 'ProjectsList' : 'Dashboard'),
          },
        ]);
      } else {
        Alert.alert('Error', result?.error || 'Failed to save project');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyLocation = async () => {
    const address = formData.address.trim();
    if (!address) {
      Alert.alert('Address required', 'Enter an address to verify.');
      return;
    }
    setVerifyingLocation(true);
    try {
      const results = await Location.geocodeAsync(address);
      const first = results?.[0];
      if (!first?.latitude || !first?.longitude) {
        throw new Error('Could not find coordinates for this address.');
      }
      setJobSiteLatitude(first.latitude);
      setJobSiteLongitude(first.longitude);
      setLocationVerified(true);
    } catch (error) {
      console.warn('verifyLocation:error', error);
      setLocationVerified(false);
      Alert.alert(
        'Location not found',
        'Try adding city/state/zip, or tap "Use Current Location" instead.'
      );
    } finally {
      setVerifyingLocation(false);
    }
  };

  const useCurrentLocation = async () => {
    setVerifyingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow location access to use your current location.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = position?.coords;
      if (!coords?.latitude || !coords?.longitude) {
        throw new Error('Could not read current location.');
      }
      const [geo] = (await Location.reverseGeocodeAsync(coords)) || [];
      const composedAddress = geo
        ? [
            geo.name,
            geo.street,
            geo.city,
            geo.region,
            geo.postalCode,
            geo.country,
          ]
            .filter(Boolean)
            .join(', ')
        : '';
      if (composedAddress) {
        updateField('address', composedAddress);
      }
      setJobSiteLatitude(coords.latitude);
      setJobSiteLongitude(coords.longitude);
      setLocationVerified(true);
    } catch (error) {
      console.error('useCurrentLocation:error', error);
      setLocationVerified(false);
      Alert.alert('Error', error?.message || 'Could not fetch current location.');
    } finally {
      setVerifyingLocation(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Project Details</Text>
      
      <Text style={styles.label}>Project Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Kitchen Renovation"
        value={formData.title}
        onChangeText={(value) => updateField('title', value)}
      />

      <Text style={styles.label}>Project Type *</Text>
      <View style={styles.typeGrid}>
        {projectTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeCard,
              projectType === type.id && styles.typeCardActive
            ]}
            onPress={() => setProjectType(type.id)}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <Text style={[
              styles.typeLabel,
              projectType === type.id && styles.typeLabelActive
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Project Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe what you want to accomplish..."
        multiline
        numberOfLines={4}
        value={formData.description}
        onChangeText={(value) => updateField('description', value)}
      />

      <Text style={styles.label}>Estimated Budget *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount in USD"
        keyboardType="numeric"
        value={formData.estimatedBudget}
        onChangeText={(value) => updateField('estimatedBudget', value)}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Timeline & Location</Text>
      
      <Text style={styles.label}>Project Timeline *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 3-4 weeks"
        value={formData.timeline}
        onChangeText={(value) => updateField('timeline', value)}
      />

      <Text style={styles.label}>Project Address *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter project location"
        value={formData.address}
        onChangeText={(value) => updateField('address', value)}
      />
      <View style={styles.locationStatusRow}>
        {verifyingLocation ? (
          <>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={styles.statusText}>Verifying location...</Text>
          </>
        ) : locationVerified ? (
          <Text style={styles.verifiedText}>✓ Address verified for GPS check-ins</Text>
        ) : (
          <Text style={styles.statusText}>Not verified yet</Text>
        )}
      </View>
      <View style={styles.locationButtons}>
        <TouchableOpacity style={styles.verifyButton} onPress={verifyLocation} disabled={verifyingLocation}>
          <Text style={styles.verifyButtonText}>Verify Address</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.useCurrentButton} onPress={useCurrentLocation} disabled={verifyingLocation}>
          <Text style={styles.useCurrentText}>Use Current Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => {
    const totalAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Define Milestones</Text>
        <Text style={styles.stepSubtitle}>
          Break your project into milestones for better tracking
        </Text>

        {milestones.map((milestone, index) => (
          <View key={index} style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>Milestone {index + 1}</Text>
              {milestones.length > 1 && (
                <TouchableOpacity onPress={() => removeMilestone(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Milestone Name"
              value={milestone.name}
              onChangeText={(value) => updateMilestone(index, 'name', value)}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Amount ($)"
              keyboardType="numeric"
              value={milestone.amount}
              onChangeText={(value) => updateMilestone(index, 'amount', value)}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              multiline
              numberOfLines={2}
              value={milestone.description}
              onChangeText={(value) => updateMilestone(index, 'description', value)}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addMilestone}>
          <Text style={styles.addButtonText}>+ Add Milestone</Text>
        </TouchableOpacity>

        {formData.estimatedBudget && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Milestones: ${totalAmount}</Text>
            <Text style={styles.budgetLabel}>Project Budget: ${formData.estimatedBudget}</Text>
            {totalAmount > parseFloat(formData.estimatedBudget) && (
              <Text style={styles.warningText}>⚠️ Total exceeds budget</Text>
            )}
          </View>
        )}

        <View style={styles.attachmentsHeader}>
          <Text style={styles.stepTitle}>Inspiration / Drawings</Text>
          <Text style={styles.stepSubtitle}>
            Add photos from your library (plans, inspiration, notes)
          </Text>
        </View>

        <View style={styles.photoGrid}>
          {attachments.map((attachment, index) => (
            <View key={`att-${index}`} style={styles.photoTile}>
              <Image
                source={{ uri: attachment.dataUri || attachment.uri }}
                style={styles.photo}
              />
              <TouchableOpacity style={styles.removePhoto} onPress={() => removeAttachment(index)}>
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {attachments.length < 6 && (
            <>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={() => pickAttachment(attachments.length, 'camera')}
              >
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={() => pickAttachment(attachments.length, 'library')}
              >
                <Text style={styles.addPhotoIcon}>🖼️</Text>
                <Text style={styles.addPhotoText}>Gallery</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {existingProject ? 'Edit Project' : 'Create New Project'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
            </View>
            <Text style={styles.stepIndicator}>Step {step} of 3</Text>
          </View>

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStep(step - 1)}
              >
                <Text style={styles.secondaryButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.primaryButton, step === 1 && styles.fullWidth]}
              onPress={handleContinue}
            >
              <Text style={styles.primaryButtonText}>
                {step === 3 ? (existingProject ? 'Submit Changes' : 'Create Project') : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

          {existingProject && (
            <View style={styles.deleteContainer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  Alert.alert(
                    'Delete Project',
                    'Are you sure you want to delete this project?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          const result = await dispatch(
                            removeProject(existingProject.id, user?.id)
                          );
                          if (result?.success) {
                            navigation.navigate(
                              origin === 'ProjectsList' ? 'ProjectsList' : 'Dashboard'
                            );
                          } else {
                            Alert.alert('Error', result?.error || 'Failed to delete project');
                          }
                        },
                      },
                    ]
                  )
                }
              >
                <Text style={styles.deleteButtonText}>Delete Project</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
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
  progressContainer: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: palette.border,
    borderRadius: 6,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 6,
  },
  stepIndicator: {
    fontSize: 14,
    color: palette.muted,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    color: palette.text,
  },
  stepSubtitle: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
    color: palette.text,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
    color: palette.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  statusText: {
    color: palette.muted,
  },
  verifiedText: {
    color: palette.success,
    fontWeight: '700',
  },
  useCurrentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  useCurrentText: {
    color: palette.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  verifyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: palette.primary,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  typeCard: {
    width: '48%',
    padding: 18,
    backgroundColor: palette.surface,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  typeCardActive: {
    backgroundColor: '#EEF2FF',
    borderColor: palette.primary,
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: palette.muted,
  },
  typeLabelActive: {
    color: palette.primary,
    fontWeight: '700',
  },
  milestoneCard: {
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.text,
  },
  removeButton: {
    fontSize: 20,
    color: '#FF6B6B',
  },
  addButton: {
    backgroundColor: '#EEF2FF',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  addButtonText: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  totalContainer: {
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: palette.text,
  },
  budgetLabel: {
    fontSize: 14,
    color: palette.muted,
  },
  warningText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginTop: 6,
  },
  attachmentsHeader: {
    marginTop: 10,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
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
  secondaryButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  fullWidth: {
    flex: 1,
  },
  deleteContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  deleteButton: {
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  attachmentRow: {
    marginTop: 8,
    paddingVertical: 4,
    gap: 10,
  },
  attachmentCard: {
    width: 180,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.border,
    marginRight: 10,
  },
  attachmentRemove: {
    alignSelf: 'flex-end',
  },
  previewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: palette.border,
  },
  addAttachmentCard: {
    width: 120,
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.surface,
  },
  pickRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  mediaPicker: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderStyle: 'dashed',
  },
  mediaPickerIcon: { fontSize: 20, marginBottom: 6 },
  mediaPickerText: { color: palette.text, fontWeight: '700' },
  cardPickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  photoTile: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: palette.border,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  removePhotoText: {
    color: '#fff',
    fontWeight: '700',
  },
  addPhotoButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: 10,
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  addPhotoText: {
    color: palette.text,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default CreateProjectScreen;
