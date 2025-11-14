import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const usableHeight = height - (insets.top + insets.bottom);
  const isSmallScreen = usableHeight < 780;
  const isExtraSmallScreen = usableHeight < 680;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View
        style={[
          styles.content,
          isSmallScreen && styles.contentSmall,
          isExtraSmallScreen && styles.contentExtraSmall
        ]}
      >
        {/* Logo Section */}
        <View
          style={[
            styles.logoSection,
            isSmallScreen && styles.logoSectionSmall,
            isExtraSmallScreen && styles.logoSectionExtraSmall
          ]}
        >
          <View
            style={[
              styles.logoPlaceholder,
              isSmallScreen && styles.logoPlaceholderSmall,
              isExtraSmallScreen && styles.logoPlaceholderExtraSmall
            ]}
          >
            <Text
              style={[
                styles.logoText,
                isSmallScreen && styles.logoTextSmall,
                isExtraSmallScreen && styles.logoTextExtraSmall
              ]}
            >
              🏠
            </Text>
          </View>
          <Text
            style={[
              styles.title,
              isSmallScreen && styles.titleSmall,
              isExtraSmallScreen && styles.titleExtraSmall
            ]}
          >
            NINOFI
          </Text>
        </View>

        {/* Welcome Text */}
        <View
          style={[
            styles.welcomeSection,
            isSmallScreen && styles.welcomeSectionSmall,
            isExtraSmallScreen && styles.welcomeSectionExtraSmall
          ]}
        >
          <Text
            style={[
              styles.welcomeTitle,
              isSmallScreen && styles.welcomeTitleSmall,
              isExtraSmallScreen && styles.welcomeTitleExtraSmall
            ]}
          >
            Welcome to NINOFI
          </Text>
          <Text
            style={[
              styles.welcomeSubtitle,
              isSmallScreen && styles.welcomeSubtitleSmall,
              isExtraSmallScreen && styles.welcomeSubtitleExtraSmall
            ]}
          >
            The trusted platform for home renovation and construction projects with 
            milestone-based escrow protection
          </Text>
        </View>

        {/* Features */}
        <View
          style={[
            styles.featuresSection,
            isSmallScreen && styles.featuresSectionSmall,
            isExtraSmallScreen && styles.featuresSectionExtraSmall
          ]}
        >
          <View
            style={[
              styles.feature,
              isSmallScreen && styles.featureSmall,
              isExtraSmallScreen && styles.featureExtraSmall
            ]}
          >
            <Text
              style={[
                styles.featureIcon,
                isSmallScreen && styles.featureIconSmall,
                isExtraSmallScreen && styles.featureIconExtraSmall
              ]}
            >
              🔒
            </Text>
            <View style={styles.featureText}>
              <Text
                style={[
                  styles.featureTitle,
                  isSmallScreen && styles.featureTitleSmall,
                  isExtraSmallScreen && styles.featureTitleExtraSmall
                ]}
              >
                Secure Escrow Protection
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  isSmallScreen && styles.featureDescriptionSmall,
                  isExtraSmallScreen && styles.featureDescriptionExtraSmall
                ]}
              >
                Funds released only when milestones are approved
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.feature,
              isSmallScreen && styles.featureSmall,
              isExtraSmallScreen && styles.featureExtraSmall
            ]}
          >
            <Text
              style={[
                styles.featureIcon,
                isSmallScreen && styles.featureIconSmall,
                isExtraSmallScreen && styles.featureIconExtraSmall
              ]}
            >
              ✅
            </Text>
            <View style={styles.featureText}>
              <Text
                style={[
                  styles.featureTitle,
                  isSmallScreen && styles.featureTitleSmall,
                  isExtraSmallScreen && styles.featureTitleExtraSmall
                ]}
              >
                Verified Contractors
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  isSmallScreen && styles.featureDescriptionSmall,
                  isExtraSmallScreen && styles.featureDescriptionExtraSmall
                ]}
              >
                ID checks, licensing, and insurance verification
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.feature,
              isSmallScreen && styles.featureSmall,
              isExtraSmallScreen && styles.featureExtraSmall
            ]}
          >
            <Text
              style={[
                styles.featureIcon,
                isSmallScreen && styles.featureIconSmall,
                isExtraSmallScreen && styles.featureIconExtraSmall
              ]}
            >
              📱
            </Text>
            <View style={styles.featureText}>
              <Text
                style={[
                  styles.featureTitle,
                  isSmallScreen && styles.featureTitleSmall,
                  isExtraSmallScreen && styles.featureTitleExtraSmall
                ]}
              >
                Mobile-First Experience
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  isSmallScreen && styles.featureDescriptionSmall,
                  isExtraSmallScreen && styles.featureDescriptionExtraSmall
                ]}
              >
                Real-time approvals and progress tracking on-the-go
              </Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View
          style={[
            styles.buttonSection,
            isSmallScreen && styles.buttonSectionSmall,
            isExtraSmallScreen && styles.buttonSectionExtraSmall
          ]}
        >
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              isSmallScreen && styles.primaryButtonSmall,
              isExtraSmallScreen && styles.primaryButtonExtraSmall
            ]}
            onPress={() => navigation.navigate('RoleSelection')}
          >
            <Text
              style={[
                styles.primaryButtonText,
                isSmallScreen && styles.primaryButtonTextSmall,
                isExtraSmallScreen && styles.primaryButtonTextExtraSmall
              ]}
            >
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.secondaryButton,
              isSmallScreen && styles.secondaryButtonSmall,
              isExtraSmallScreen && styles.secondaryButtonExtraSmall
            ]}
            onPress={() => console.log('Learn More')}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isSmallScreen && styles.secondaryButtonTextSmall,
                isExtraSmallScreen && styles.secondaryButtonTextExtraSmall
              ]}
            >
              Learn More
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity onPress={() => console.log('Skip')}>
          <Text
            style={[
              styles.skipText,
              isSmallScreen && styles.skipTextSmall,
              isExtraSmallScreen && styles.skipTextExtraSmall
            ]}
          >
            Skip Introduction
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingVertical: 30,
  },
  contentSmall: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  contentExtraSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoSectionSmall: {
    marginTop: 10,
  },
  logoSectionExtraSmall: {
    marginTop: 0,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 50,
  },
  logoPlaceholderSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoPlaceholderExtraSmall: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  logoTextSmall: {
    fontSize: 40,
  },
  logoTextExtraSmall: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  titleSmall: {
    fontSize: 26,
  },
  titleExtraSmall: {
    fontSize: 22,
  },
  welcomeSection: {
    alignItems: 'center',
    marginTop: 30,
  },
  welcomeSectionSmall: {
    marginTop: 16,
  },
  welcomeSectionExtraSmall: {
    marginTop: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeTitleSmall: {
    fontSize: 20,
  },
  welcomeTitleExtraSmall: {
    fontSize: 18,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  welcomeSubtitleSmall: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  welcomeSubtitleExtraSmall: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 0,
  },
  featuresSection: {
    marginTop: 40,
  },
  featuresSectionSmall: {
    marginTop: 20,
  },
  featuresSectionExtraSmall: {
    marginTop: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  featureSmall: {
    marginBottom: 16,
  },
  featureExtraSmall: {
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  featureIconSmall: {
    fontSize: 24,
    marginRight: 12,
  },
  featureIconExtraSmall: {
    fontSize: 20,
    marginRight: 8,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureTitleSmall: {
    fontSize: 14,
  },
  featureTitleExtraSmall: {
    fontSize: 13,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
  featureDescriptionSmall: {
    fontSize: 12,
  },
  featureDescriptionExtraSmall: {
    fontSize: 11,
  },
  buttonSection: {
    marginTop: 40,
  },
  buttonSectionSmall: {
    marginTop: 20,
  },
  buttonSectionExtraSmall: {
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonSmall: {
    paddingVertical: 12,
  },
  primaryButtonExtraSmall: {
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButtonTextSmall: {
    fontSize: 16,
  },
  primaryButtonTextExtraSmall: {
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#1976D2',
    paddingVertical: 16,
    borderRadius: 8,
  },
  secondaryButtonSmall: {
    paddingVertical: 12,
  },
  secondaryButtonExtraSmall: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#1976D2',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonTextSmall: {
    fontSize: 16,
  },
  secondaryButtonTextExtraSmall: {
    fontSize: 15,
  },
  skipText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  skipTextSmall: {
    fontSize: 12,
    marginBottom: 10,
  },
  skipTextExtraSmall: {
    fontSize: 11,
    marginBottom: 6,
  },
});

export default WelcomeScreen;
