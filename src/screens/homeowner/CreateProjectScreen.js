import React, { useState } from 'react';
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
} from 'react-native';

const CreateProjectScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    timeline: '',
    address: '',
  });
  const [milestones, setMilestones] = useState([
    { name: '', amount: '', description: '' }
  ]);

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

  const handleContinue = () => {
    if (step === 1) {
      if (!formData.title || !projectType || !formData.description || !formData.budget) {
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

  const handleSubmit = () => {
    const totalMilestones = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    if (totalMilestones > parseFloat(formData.budget)) {
      Alert.alert('Budget Exceeded', 'Total milestones exceed project budget');
      return;
    }

    const projectData = {
      ...formData,
      projectType,
      milestones,
      status: 'draft',
    };

    Alert.alert('Success', 'Project created! Now fund it to get started.', [
      { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
    ]);
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
        value={formData.budget}
        onChangeText={(value) => updateField('budget', value)}
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

        {formData.budget && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Milestones: ${totalAmount}</Text>
            <Text style={styles.budgetLabel}>Project Budget: ${formData.budget}</Text>
            {totalAmount > parseFloat(formData.budget) && (
              <Text style={styles.warningText}>⚠️ Total exceeds budget</Text>
            )}
          </View>
        )}
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
            <Text style={styles.headerTitle}>Create New Project</Text>
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
                {step === 3 ? 'Create Project' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
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
});

export default CreateProjectScreen;