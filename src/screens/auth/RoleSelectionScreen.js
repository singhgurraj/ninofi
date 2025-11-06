import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { setRole } from '../../store/authSlice';

const RoleSelectionScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  const roles = [
    {
      id: 'homeowner',
      title: 'Homeowner',
      description: 'Manage renovation projects, fund escrow accounts, and approve milestone payments',
      icon: 'home',
      benefits: ['Secure payments', 'Verified contractors'],
      color: '#4CAF50',
    },
    {
      id: 'contractor',
      title: 'Contractor',
      description: 'Find projects, manage teams, submit milestones, and receive guaranteed payments',
      icon: 'hard-hat',
      benefits: ['Reliable payments', 'Project management'],
      color: '#2196F3',
    },
    {
      id: 'worker',
      title: 'Worker',
      description: 'Browse available gigs, work on projects, and get paid for completed tasks',
      icon: 'hammer',
      benefits: ['Quick gigs', 'Fair compensation'],
      color: '#FF9800',
    },
  ];

  const selectRole = (role) => {
    dispatch(setRole(role));
    navigation.navigate('Register', { role });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Choose Your Role</Text>
      <Text style={styles.subtitle}>
        Select how you'll be using NINOFI to get started
      </Text>

      {roles.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={[styles.roleCard, { borderLeftColor: role.color }]}
          onPress={() => selectRole(role.id)}
        >
          <View style={styles.roleHeader}>
            <Icon name={role.icon} size={40} color={role.color} />
            <Text style={styles.roleTitle}>{role.title}</Text>
          </View>
          <Text style={styles.roleDescription}>{role.description}</Text>
          <View style={styles.benefits}>
            {role.benefits.map((benefit, index) => (
              <Text key={index} style={styles.benefit}>
                • {benefit}
              </Text>
            ))}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity 
        onPress={() => navigation.navigate('Login')}
        style={styles.loginButton}
      >
        <Text style={styles.loginLink}>
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 10,
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
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  roleCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 15,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  benefit: {
    fontSize: 12,
    color: '#888',
    marginRight: 15,
  },
  loginButton: {
    marginTop: 20,
    padding: 15,
    alignItems: 'center',
  },
  loginLink: {
    textAlign: 'center',
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RoleSelectionScreen;