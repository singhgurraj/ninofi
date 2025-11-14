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
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('RoleSelection')}
        >
          <Text style={styles.nextIcon}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3ECFF',
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
    opacity: 0.4,
    borderBottomRightRadius: 220,
    borderBottomLeftRadius: 220,
  },
  backgroundBlob: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#E4D6FF',
    opacity: 0.7,
    bottom: -120,
    right: -60,
    transform: [{ rotate: '-18deg' }],
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: 'flex-start',
    gap: 60,
  },
  textBlock: {
    marginTop: 40,
  },
  headline: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1C1C1C',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  headlineCompact: {
    fontSize: 34,
    lineHeight: 40,
  },
  nextButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#7E4DFF',
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    shadowColor: '#7E4DFF',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },
  nextIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
