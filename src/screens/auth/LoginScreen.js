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
    Image,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../services/auth';
import palette from '../../styles/palette';

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
          <View style={styles.headerShell}>
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
              <View style={styles.socialIconWrap}>
                <Image source={require('../../../assets/images/747.png')} style={styles.socialLogo} />
              </View>
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
              <View style={[styles.socialIconWrap, styles.googleIconOffset]}>
                <Image source={require('../../../assets/images/google.png')} style={styles.socialLogo} />
              </View>
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
    backgroundColor: palette.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  scrollContentSmall: {
    paddingBottom: 12,
  },
  scrollContentExtraSmall: {
    paddingBottom: 8,
  },
  headerShell: {
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 6,
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
  backTextSmall: {
    fontSize: 22,
  },
  backTextExtraSmall: {
    fontSize: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
    color: palette.text,
    letterSpacing: 0.2,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
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
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  subtitleSmall: {
    fontSize: 15,
  },
  subtitleExtraSmall: {
    fontSize: 14,
  },
  form: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  formSmall: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  formExtraSmall: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputContainerSmall: {
    marginBottom: 16,
  },
  inputContainerExtraSmall: {
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: palette.text,
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
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    color: palette.text,
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
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
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
    color: palette.muted,
  },
  eyeTextSmall: {
    fontSize: 18,
  },
  eyeTextExtraSmall: {
    fontSize: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotButtonSmall: {
    marginBottom: 16,
  },
  forgotButtonExtraSmall: {
    marginBottom: 12,
  },
  forgotText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  forgotTextSmall: {
    fontSize: 13,
  },
  forgotTextExtraSmall: {
    fontSize: 12,
  },
  loginButton: {
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
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
    backgroundColor: '#A5B4FC',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
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
    marginVertical: 18,
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
    backgroundColor: palette.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '600',
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
    borderColor: palette.border,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: palette.surface,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  socialButtonSmall: {
    paddingVertical: 12,
    marginBottom: 10,
  },
  socialButtonExtraSmall: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  socialIconWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  googleIconOffset: {
    marginRight: 4,
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
  socialLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
    resizeMode: 'contain',
  },
  socialButtonText: {
    fontSize: 15,
    color: palette.text,
    fontWeight: '700',
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
    marginTop: 16,
  },
  signupContainerSmall: {
    marginTop: 16,
  },
  signupContainerExtraSmall: {
    marginTop: 12,
  },
  signupText: {
    color: palette.muted,
    fontSize: 15,
  },
  signupTextSmall: {
    fontSize: 15,
  },
  signupTextExtraSmall: {
    fontSize: 14,
  },
  signupLink: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  signupLinkSmall: {
    fontSize: 15,
  },
  signupLinkExtraSmall: {
    fontSize: 14,
  },
});

export default LoginScreen;
