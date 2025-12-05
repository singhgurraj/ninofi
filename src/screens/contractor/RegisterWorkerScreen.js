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
        <Text style={styles.subtitle}>Worker registration flow coming soon.</Text>
        <Text style={styles.note}>
          You’ll be able to add employees here and then assign them to projects as personnel.
        </Text>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backText: { fontSize: 22, color: palette.text },
  title: { fontSize: 20, fontWeight: '700', color: palette.text },
  body: { padding: 20, gap: 12 },
  subtitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  note: { color: palette.muted, lineHeight: 20 },
});

export default RegisterWorkerScreen;
