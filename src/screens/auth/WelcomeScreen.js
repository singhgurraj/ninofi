import {
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>🏠</Text>
          </View>
          <Text style={styles.title}>NINOFI</Text>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to NINOFI</Text>
          <Text style={styles.welcomeSubtitle}>
            The trusted platform for home renovation and construction projects with 
            milestone-based escrow protection
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Secure Escrow Protection</Text>
              <Text style={styles.featureDescription}>
                Funds released only when milestones are approved
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✅</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Verified Contractors</Text>
              <Text style={styles.featureDescription}>
                ID checks, licensing, and insurance verification
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📱</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Mobile-First Experience</Text>
              <Text style={styles.featureDescription}>
                Real-time approvals and progress tracking on-the-go
              </Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('RoleSelection')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => console.log('Learn More')}
          >
            <Text style={styles.secondaryButtonText}>Learn More</Text>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity onPress={() => console.log('Skip')}>
          <Text style={styles.skipText}>Skip Introduction</Text>
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
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  welcomeSection: {
    alignItems: 'center',
    marginTop: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresSection: {
    marginTop: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  featureIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
  buttonSection: {
    marginTop: 40,
  },
  primaryButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#1976D2',
    paddingVertical: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#1976D2',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  skipText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
});

export default WelcomeScreen;