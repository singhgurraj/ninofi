import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../services/auth';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter email and password');
      return;
    }
    
    const result = await dispatch(login(email, password));
    
    if (result.success) {
      Alert.alert('Success', 'Login successful!');
      // TODO: Navigate to dashboard based on role
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialIcon}>🍎</Text>
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialIcon}>🔵</Text>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
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
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeButton: {
    padding: 15,
  },
  eyeText: {
    fontSize: 20,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: '#1976D2',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  socialIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  socialButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#666',
    fontSize: 16,
  },
  signupLink: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;