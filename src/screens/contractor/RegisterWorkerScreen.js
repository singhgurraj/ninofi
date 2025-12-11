import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import palette from '../../styles/palette';

const RegisterWorkerScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Register Worker</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Worker registration flow coming soon.</Text>
          <Text style={styles.note}>
            You’ll be able to add employees here and then assign them to projects as personnel.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  backText: { fontSize: 24, color: palette.text },
  title: { fontSize: 22, fontWeight: '800', color: palette.text },
  body: { padding: 20, gap: 12 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: 8,
  },
  subtitle: { fontSize: 16, fontWeight: '800', color: palette.text },
  note: { color: palette.muted, lineHeight: 20 },
});

export default RegisterWorkerScreen;
