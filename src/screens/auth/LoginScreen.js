import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../services/auth';

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const usableHeight = height - (insets.top + insets.bottom);
  const isSmallScreen = usableHeight < 780;
  const isExtraSmallScreen = usableHeight < 680;
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

  const scrollContentStyle = [
    styles.scrollContent,
    isSmallScreen && styles.scrollContentSmall,
    isExtraSmallScreen && styles.scrollContentExtraSmall
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={scrollContentStyle}
          bounces={false}
        >
          <View style={[
            styles.header,
            isSmallScreen && styles.headerSmall,
            isExtraSmallScreen && styles.headerExtraSmall
          ]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={[
                styles.backText,
                isSmallScreen && styles.backTextSmall,
                isExtraSmallScreen && styles.backTextExtraSmall
              ]}>←</Text>
            </TouchableOpacity>
            <Text style={[
              styles.title,
              isSmallScreen && styles.titleSmall,
              isExtraSmallScreen && styles.titleExtraSmall
            ]}>Welcome Back</Text>
            <Text style={[
              styles.subtitle,
              isSmallScreen && styles.subtitleSmall,
              isExtraSmallScreen && styles.subtitleExtraSmall
            ]}>Sign in to continue</Text>
          </View>

          <View style={[
            styles.form,
            isSmallScreen && styles.formSmall,
            isExtraSmallScreen && styles.formExtraSmall
          ]}>
            <View style={[
              styles.inputContainer,
              isSmallScreen && styles.inputContainerSmall,
              isExtraSmallScreen && styles.inputContainerExtraSmall
            ]}>
              <Text style={[
                styles.label,
                isSmallScreen && styles.labelSmall,
                isExtraSmallScreen && styles.labelExtraSmall
              ]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  isSmallScreen && styles.inputSmall,
                  isExtraSmallScreen && styles.inputExtraSmall
                ]}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={[
              styles.inputContainer,
              isSmallScreen && styles.inputContainerSmall,
              isExtraSmallScreen && styles.inputContainerExtraSmall
            ]}>
              <Text style={[
                styles.label,
                isSmallScreen && styles.labelSmall,
                isExtraSmallScreen && styles.labelExtraSmall
              ]}>Password</Text>
              <View style={[
                styles.passwordContainer,
                isSmallScreen && styles.passwordContainerSmall,
                isExtraSmallScreen && styles.passwordContainerExtraSmall
              ]}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    isSmallScreen && styles.passwordInputSmall,
                    isExtraSmallScreen && styles.passwordInputExtraSmall
                  ]}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={[
                    styles.eyeButton,
                    isSmallScreen && styles.eyeButtonSmall,
                    isExtraSmallScreen && styles.eyeButtonExtraSmall
                  ]}
                >
                  <Text style={[
                    styles.eyeText,
                    isSmallScreen && styles.eyeTextSmall,
                    isExtraSmallScreen && styles.eyeTextExtraSmall
                  ]}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[
              styles.forgotButton,
              isSmallScreen && styles.forgotButtonSmall,
              isExtraSmallScreen && styles.forgotButtonExtraSmall
            ]}>
              <Text style={[
                styles.forgotText,
                isSmallScreen && styles.forgotTextSmall,
                isExtraSmallScreen && styles.forgotTextExtraSmall
              ]}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.loginButton,
                isSmallScreen && styles.loginButtonSmall,
                isExtraSmallScreen && styles.loginButtonExtraSmall,
                isLoading && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[
                  styles.loginButtonText,
                  isSmallScreen && styles.loginButtonTextSmall,
                  isExtraSmallScreen && styles.loginButtonTextExtraSmall
                ]}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={[
              styles.divider,
              isSmallScreen && styles.dividerSmall,
              isExtraSmallScreen && styles.dividerExtraSmall
            ]}>
              <View style={styles.dividerLine} />
              <Text style={[
                styles.dividerText,
                isSmallScreen && styles.dividerTextSmall,
                isExtraSmallScreen && styles.dividerTextExtraSmall
              ]}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={[
                styles.socialButton,
                isSmallScreen && styles.socialButtonSmall,
                isExtraSmallScreen && styles.socialButtonExtraSmall
              ]}
              disabled={isLoading}
            >
              <Text style={[
                styles.socialIcon,
                isSmallScreen && styles.socialIconSmall,
                isExtraSmallScreen && styles.socialIconExtraSmall
              ]}>🍎</Text>
              <Text style={[
                styles.socialButtonText,
                isSmallScreen && styles.socialButtonTextSmall,
                isExtraSmallScreen && styles.socialButtonTextExtraSmall
              ]}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.socialButton,
                isSmallScreen && styles.socialButtonSmall,
                isExtraSmallScreen && styles.socialButtonExtraSmall
              ]}
              disabled={isLoading}
            >
              <Text style={[
                styles.socialIcon,
                isSmallScreen && styles.socialIconSmall,
                isExtraSmallScreen && styles.socialIconExtraSmall
              ]}>🔵</Text>
              <Text style={[
                styles.socialButtonText,
                isSmallScreen && styles.socialButtonTextSmall,
                isExtraSmallScreen && styles.socialButtonTextExtraSmall
              ]}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={[
              styles.signupContainer,
              isSmallScreen && styles.signupContainerSmall,
              isExtraSmallScreen && styles.signupContainerExtraSmall
            ]}>
              <Text style={[
                styles.signupText,
                isSmallScreen && styles.signupTextSmall,
                isExtraSmallScreen && styles.signupTextExtraSmall
              ]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[
                  styles.signupLink,
                  isSmallScreen && styles.signupLinkSmall,
                  isExtraSmallScreen && styles.signupLinkExtraSmall
                ]}>Sign Up</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  scrollContentSmall: {
    paddingBottom: 12,
  },
  scrollContentExtraSmall: {
    paddingBottom: 8,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerSmall: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  headerExtraSmall: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 4,
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
  backTextSmall: {
    fontSize: 22,
  },
  backTextExtraSmall: {
    fontSize: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  titleSmall: {
    fontSize: 28,
    marginTop: 16,
    marginBottom: 8,
  },
  titleExtraSmall: {
    fontSize: 24,
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  subtitleSmall: {
    fontSize: 15,
  },
  subtitleExtraSmall: {
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  formSmall: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  formExtraSmall: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputContainerSmall: {
    marginBottom: 16,
  },
  inputContainerExtraSmall: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  labelSmall: {
    fontSize: 15,
    marginBottom: 6,
  },
  labelExtraSmall: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  inputSmall: {
    padding: 13,
    fontSize: 15,
  },
  inputExtraSmall: {
    padding: 11,
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  passwordContainerSmall: {
    borderRadius: 6,
  },
  passwordContainerExtraSmall: {
    borderRadius: 6,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  passwordInputSmall: {
    padding: 13,
    fontSize: 15,
  },
  passwordInputExtraSmall: {
    padding: 11,
    fontSize: 14,
  },
  eyeButton: {
    padding: 15,
  },
  eyeButtonSmall: {
    padding: 12,
  },
  eyeButtonExtraSmall: {
    padding: 10,
  },
  eyeText: {
    fontSize: 20,
  },
  eyeTextSmall: {
    fontSize: 18,
  },
  eyeTextExtraSmall: {
    fontSize: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotButtonSmall: {
    marginBottom: 16,
  },
  forgotButtonExtraSmall: {
    marginBottom: 12,
  },
  forgotText: {
    color: '#1976D2',
    fontSize: 14,
  },
  forgotTextSmall: {
    fontSize: 13,
  },
  forgotTextExtraSmall: {
    fontSize: 12,
  },
  loginButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonSmall: {
    paddingVertical: 14,
    marginBottom: 16,
  },
  loginButtonExtraSmall: {
    paddingVertical: 12,
    marginBottom: 14,
  },
  loginButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginButtonTextSmall: {
    fontSize: 17,
  },
  loginButtonTextExtraSmall: {
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerSmall: {
    marginVertical: 16,
  },
  dividerExtraSmall: {
    marginVertical: 12,
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
  dividerTextSmall: {
    fontSize: 13,
  },
  dividerTextExtraSmall: {
    fontSize: 12,
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
  socialButtonSmall: {
    paddingVertical: 12,
    marginBottom: 10,
  },
  socialButtonExtraSmall: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  socialIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  socialIconSmall: {
    fontSize: 18,
    marginRight: 8,
  },
  socialIconExtraSmall: {
    fontSize: 16,
    marginRight: 6,
  },
  socialButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  socialButtonTextSmall: {
    fontSize: 15,
  },
  socialButtonTextExtraSmall: {
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupContainerSmall: {
    marginTop: 16,
  },
  signupContainerExtraSmall: {
    marginTop: 12,
  },
  signupText: {
    color: '#666',
    fontSize: 16,
  },
  signupTextSmall: {
    fontSize: 15,
  },
  signupTextExtraSmall: {
    fontSize: 14,
  },
  signupLink: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
  },
  signupLinkSmall: {
    fontSize: 15,
  },
  signupLinkExtraSmall: {
    fontSize: 14,
  },
});

export default LoginScreen;
