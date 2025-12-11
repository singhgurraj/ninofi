import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => {
  const { height } = useWindowDimensions();
  const isCompact = height < 720;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.backgroundLayer}>
        <View style={styles.backgroundGlow} />
        <View style={styles.backgroundBlob} />
      </View>

      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={[styles.headline, isCompact && styles.headlineCompact]}>
            {`Ninofi —\nconstruction,\ndone quick.`}
          </Text>
          <Text style={styles.subhead}>
            Premium, secure, and effortless project flows for homeowners and contractors.
          </Text>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('RoleSelection')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backgroundGlow: {
    position: 'absolute',
    width: '140%',
    height: '70%',
    top: -80,
    left: -20,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
    borderBottomRightRadius: 240,
    borderBottomLeftRadius: 240,
  },
  backgroundBlob: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#E0E7FF',
    opacity: 0.7,
    bottom: -120,
    right: -60,
    transform: [{ rotate: '-18deg' }],
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 60,
    justifyContent: 'space-between',
  },
  textBlock: {
    marginTop: 30,
    paddingVertical: 4,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B1224',
    lineHeight: 38,
    letterSpacing: -0.2,
  },
  headlineCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  subhead: {
    marginTop: 10,
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WelcomeScreen;
