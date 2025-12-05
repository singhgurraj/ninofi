import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { saveProject, removeProject } from '../../services/projects';

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
          url: m.url || '',
          label: m.label || '',
          localUri: '',
          dataUri: '',
        }))
      : [{ url: '', label: '', localUri: '', dataUri: '' }]
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
    setAttachments((prev) => [...prev, { url: '', label: '' }]);
  };

  const updateAttachment = (index, field, value) => {
    setAttachments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
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

  const pickAttachment = async (index) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please grant photo access to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      const dataUri = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : '';
      setAttachments((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          localUri: asset.uri || '',
          dataUri: dataUri || '',
          url: dataUri || asset.uri || next[index].url,
        };
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
      milestones: milestones.map((milestone, index) => ({
        name: milestone.name,
        amount: parseFloat(milestone.amount) || null,
        description: milestone.description,
        position: milestone.position ?? index,
      })),
      media: attachments
        .filter((a) => a.url)
        .map((a) => ({
          url: a.url,
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
            Add URLs to architectural drawings or inspiration images
          </Text>
        </View>

        {attachments.map((attachment, index) => (
          <View key={`att-${index}`} style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>Attachment {index + 1}</Text>
              {attachments.length > 1 && (
                <TouchableOpacity onPress={() => removeAttachment(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.pickButton}
              onPress={() => pickAttachment(index)}
            >
              <Text style={styles.pickButtonText}>
                {attachment.localUri || attachment.url ? 'Change Image' : 'Pick from Library'}
              </Text>
            </TouchableOpacity>
            {(attachment.localUri || attachment.url) ? (
              <Image
                source={{ uri: attachment.localUri || attachment.url }}
                style={styles.preview}
              />
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Image or drawing URL"
              value={attachment.url}
              onChangeText={(value) => updateAttachment(index, 'url', value)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Label (optional)"
              value={attachment.label}
              onChangeText={(value) => updateAttachment(index, 'label', value)}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addAttachment}>
          <Text style={styles.addButtonText}>+ Add Attachment</Text>
        </TouchableOpacity>
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
    backgroundColor: '#F5F5F5',
  },
  flex: {
    flex: 1,
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
  progressContainer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 4,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  typeCard: {
    width: '48%',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  typeCardActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: '#666',
  },
  typeLabelActive: {
    color: '#1976D2',
    fontWeight: '600',
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    fontSize: 20,
    color: '#f44336',
  },
  addButton: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
  },
  totalContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
  },
  warningText: {
    color: '#FF9800',
    fontSize: 14,
    marginTop: 5,
  },
  attachmentsHeader: {
    marginTop: 10,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
});

export default CreateProjectScreen;
