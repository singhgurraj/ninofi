import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Keyboard,
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
import { register } from '../../services/auth';
import palette from '../../styles/palette';

const RegisterScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const usableHeight = height - (insets.top + insets.bottom);
  const isSmallScreen = usableHeight < 780;
  const isExtraSmallScreen = usableHeight < 680;
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  const selectedRole = route.params?.role || 'homeowner';
  const roleLabel = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isInputFocused, setInputFocused] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isKeyboardVisible && !isInputFocused && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [isKeyboardVisible, isInputFocused]);

  const handleRegister = async () => {
    // Validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      Alert.alert('Required', 'Please fill in all required fields');
      return;
    }
    
    if (formData.password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }
    
    if (!agreeToTerms) {
      Alert.alert('Terms Required', 'Please agree to the Terms of Service');
      return;
    }
    
    const userData = {
      ...formData,
      role: selectedRole,
    };
    
    const result = await dispatch(register(userData));
    
    if (result.success) {
      Alert.alert('Success', 'Account created successfully!');
      // TODO: Navigate to dashboard based on role
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleInputFocus = () => setInputFocused(true);
  const handleInputBlur = () => setInputFocused(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const keyboardPadding = isExtraSmallScreen ? 200 : isSmallScreen ? 160 : 140;
  const defaultBottomPadding = 0;
  const dynamicPaddingBottom = (isKeyboardVisible || isInputFocused) ? keyboardPadding : defaultBottomPadding;
  const scrollContentStyle = [
    styles.scrollContent,
    { paddingBottom: dynamicPaddingBottom },
    isSmallScreen && styles.scrollContentSmall,
    isExtraSmallScreen && styles.scrollContentExtraSmall
  ];
  const scrollEnabled = isInputFocused || isKeyboardVisible;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.screenContent}>
          <ScrollView 
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={scrollContentStyle}
            bounces={false}
            scrollEnabled={scrollEnabled}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollView}
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
              <Text
                style={[
                  styles.title,
                  isSmallScreen && styles.titleSmall,
                  isExtraSmallScreen && styles.titleExtraSmall
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {`Create ${roleLabel} Account`}
              </Text>
              <View style={styles.headerLinkRow}>
                <Text style={[
                  styles.subtitle,
                  isSmallScreen && styles.subtitleSmall,
                  isExtraSmallScreen && styles.subtitleExtraSmall
                ]}>
                  Already have an account?
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[
                    styles.headerLink,
                    isSmallScreen && styles.headerLinkSmall,
                    isExtraSmallScreen && styles.headerLinkExtraSmall
                  ]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
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
              ]}>Full Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  isSmallScreen && styles.inputSmall,
                  isExtraSmallScreen && styles.inputExtraSmall
                ]}
                placeholder="Enter your full name"
                value={formData.fullName}
                onChangeText={(value) => updateField('fullName', value)}
                autoCapitalize="words"
                editable={!isLoading}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
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
              ]}>Email *</Text>
              <TextInput
                style={[
                  styles.input,
                  isSmallScreen && styles.inputSmall,
                  isExtraSmallScreen && styles.inputExtraSmall
                ]}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
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
              ]}>Phone Number *</Text>
              <TextInput
                style={[
                  styles.input,
                  isSmallScreen && styles.inputSmall,
                  isExtraSmallScreen && styles.inputExtraSmall
                ]}
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChangeText={(value) => updateField('phone', value)}
                keyboardType="phone-pad"
                editable={!isLoading}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
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
              ]}>Password *</Text>
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
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(value) => updateField('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
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
              <Text style={[
                styles.hint,
                isSmallScreen && styles.hintSmall,
                isExtraSmallScreen && styles.hintExtraSmall
              ]}>At least 8 characters</Text>
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
              ]}>Confirm Password *</Text>
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
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  ]}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.checkboxContainer,
                isSmallScreen && styles.checkboxContainerSmall,
                isExtraSmallScreen && styles.checkboxContainerExtraSmall
              ]}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              disabled={isLoading}
            >
              <View style={[
                styles.checkbox,
                isSmallScreen && styles.checkboxSmall,
                isExtraSmallScreen && styles.checkboxExtraSmall,
                agreeToTerms && styles.checkboxChecked
              ]}>
                {agreeToTerms && <Text style={[
                  styles.checkmark,
                  isSmallScreen && styles.checkmarkSmall,
                  isExtraSmallScreen && styles.checkmarkExtraSmall
                ]}>✓</Text>}
              </View>
              <Text style={[
                styles.checkboxText,
                isSmallScreen && styles.checkboxTextSmall,
                isExtraSmallScreen && styles.checkboxTextExtraSmall
              ]}>
                I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.registerButton,
                isSmallScreen && styles.registerButtonSmall,
                isExtraSmallScreen && styles.registerButtonExtraSmall,
                (!agreeToTerms || isLoading) && styles.registerButtonDisabled
              ]}
              onPress={handleRegister}
              disabled={!agreeToTerms || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[
                  styles.registerButtonText,
                  isSmallScreen && styles.registerButtonTextSmall,
                  isExtraSmallScreen && styles.registerButtonTextExtraSmall
                ]}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
  screenContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentSmall: {},
  scrollContentExtraSmall: {},
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
  headerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headerLink: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerLinkSmall: {
    fontSize: 15,
  },
  headerLinkExtraSmall: {
    fontSize: 14,
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
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    alignSelf: 'stretch',
    color: palette.text,
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
    color: palette.muted,
  },
  subtitleSmall: {
    fontSize: 15,
  },
  subtitleExtraSmall: {
    fontSize: 14,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  formSmall: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  formExtraSmall: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 0,
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
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F9F6FF',
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
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    backgroundColor: '#F9F6FF',
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
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  hintSmall: {
    fontSize: 11,
    marginTop: 4,
  },
  hintExtraSmall: {
    fontSize: 10,
    marginTop: 3,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkboxContainerSmall: {
    marginBottom: 16,
  },
  checkboxContainerExtraSmall: {
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSmall: {
    width: 22,
    height: 22,
  },
  checkboxExtraSmall: {
    width: 20,
    height: 20,
  },
  checkboxChecked: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkmarkSmall: {
    fontSize: 14,
  },
  checkmarkExtraSmall: {
    fontSize: 13,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20,
  },
  checkboxTextSmall: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkboxTextExtraSmall: {
    fontSize: 12,
    lineHeight: 16,
  },
  link: {
    color: palette.primary,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 0,
  },
  registerButtonSmall: {
    paddingVertical: 14,
    marginBottom: 0,
  },
  registerButtonExtraSmall: {
    paddingVertical: 12,
    marginBottom: 0,
  },
  registerButtonDisabled: {
    backgroundColor: '#CBB5FF',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  registerButtonTextSmall: {
    fontSize: 17,
  },
  registerButtonTextExtraSmall: {
    fontSize: 16,
  },
});

export default RegisterScreen;
