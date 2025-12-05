import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import palette from '../../styles/palette';

const WorkerGigDetailScreen = ({ route }) => {
  const { assignment } = route.params || {};
  if (!assignment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.muted}>No gig selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Assigned Work</Text>
        <Text style={styles.meta}>Description</Text>
        <Text style={styles.body}>{assignment.description || 'No description provided'}</Text>
        <View style={styles.row}>
          <Text style={styles.meta}>Due</Text>
          <Text style={styles.body}>{assignment.dueDate || 'TBD'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.meta}>Pay</Text>
          <Text style={styles.body}>${Number(assignment.pay || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.todoBox}>
          <Text style={styles.todoTitle}>To-Do</Text>
          <Text style={styles.muted}>Work items will appear here when assigned.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted, fontWeight: '700' },
  body: { color: palette.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  todoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  todoTitle: { fontWeight: '700', color: palette.text, marginBottom: 6 },
  muted: { color: palette.muted },
});

export default WorkerGigDetailScreen;
