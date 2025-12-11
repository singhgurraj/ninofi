import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import palette from '../../styles/palette';

const ActiveProjectsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Active Projects</Text>
        <View style={styles.card}>
          <Text style={styles.text}>Active projects will appear here once accepted by homeowners.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  card: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  text: { color: palette.muted, fontSize: 14 },
});

export default ActiveProjectsScreen;
