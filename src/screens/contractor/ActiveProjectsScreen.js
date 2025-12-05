import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import palette from '../../styles/palette';

const ActiveProjectsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>Active projects will appear here once accepted by homeowners.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20 },
  text: { color: palette.muted },
});

export default ActiveProjectsScreen;
