import { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const RoleSelectionScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: 'homeowner',
      title: 'Homeowner',
      icon: '🏠',
      description: 'Manage renovation projects, fund escrow accounts, and approve milestone payments',
      benefits: ['Secure payments', 'Verified contractors'],
      color: '#4CAF50',
    },
    {
      id: 'contractor',
      title: 'Contractor',
      icon: '👷',
      description: 'Find projects, manage teams, submit milestones, and receive guaranteed payments',
      benefits: ['Reliable payments', 'Project management'],
      color: '#2196F3',
    },
    {
      id: 'worker',
      title: 'Worker',
      icon: '🔨',
      description: 'Browse available gigs, work on projects, and get paid for completed tasks',
      benefits: ['Quick gigs', 'Fair compensation'],
      color: '#FF9800',
    },
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    console.log('Selected role:', roleId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
        >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Select how you'll be using NINOFI to get started
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.roleCardSelected,
                { borderColor: selectedRole === role.id ? role.color : '#E0E0E0' }
              ]}
              onPress={() => handleRoleSelect(role.id)}
              activeOpacity={0.7}
            >
              <View style={styles.roleHeader}>
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <Text style={styles.roleTitle}>{role.title}</Text>
                {selectedRole === role.id && (
                  <View style={[styles.checkmark, { backgroundColor: role.color }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.roleDescription}>{role.description}</Text>
              
              <View style={styles.benefitsContainer}>
                {role.benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefit}>
                    <Text style={styles.benefitText}>• {benefit}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled
          ]}
          disabled={!selectedRole}
          onPress={() => console.log('Continue with role:', selectedRole)}
        >
          <Text style={styles.continueButtonText}>
            {selectedRole ? 'Continue' : 'Select a role to continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton}>
          <Text style={styles.linkText}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 10,
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  rolesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  roleCardSelected: {
    backgroundColor: '#F5F9FF',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  benefit: {
    marginRight: 16,
  },
  benefitText: {
    fontSize: 13,
    color: '#888',
  },
  continueButton: {
    backgroundColor: '#1976D2',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  linkText: {
    color: '#1976D2',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RoleSelectionScreen;