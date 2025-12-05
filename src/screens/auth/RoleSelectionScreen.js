import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import palette from '../../styles/palette';
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
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Select how you'll be using Ninofi to get started
          </Text>
        </View>
      </View>

      <View style={styles.cardStack}>
      {roles.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={[styles.roleCard, { borderLeftColor: role.color, backgroundColor: '#F9F6FF' }]}
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
      </View>

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
    backgroundColor: palette.background,
    paddingTop: 60,
  },
  header: {
    marginTop: 0,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 48,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerCopy: {
    width: '100%',
    paddingTop: 60,
  },
  backText: {
    fontSize: 24,
    color: palette.text,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'left',
    color: palette.text,
  },
  subtitle: {
    fontSize: 16,
    color: palette.muted,
    textAlign: 'center',
  },
  cardStack: {
    marginTop: 14,
  },
  roleCard: {
    backgroundColor: palette.surface,
    padding: 20,
    marginBottom: 15,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderColor: palette.border,
    shadowColor: '#7E4DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    color: palette.text,
  },
  roleDescription: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: 10,
    lineHeight: 20,
  },
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  benefit: {
    fontSize: 12,
    color: palette.muted,
    marginRight: 15,
  },
  loginButton: {
    marginTop: 30,
    padding: 15,
    alignItems: 'center',
  },
  loginLink: {
    textAlign: 'center',
    color: palette.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RoleSelectionScreen;
