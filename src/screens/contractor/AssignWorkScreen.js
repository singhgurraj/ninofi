import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import palette from '../../styles/palette';
import { addWorkerAssignment } from '../../store/projectSlice';

const AssignWorkScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const { project, worker } = route.params || {};
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pay, setPay] = useState('');

  const handleSave = () => {
    if (!description.trim() || !dueDate.trim() || !pay.trim()) {
      Alert.alert('Missing info', 'Please fill description, date, and pay.');
      return;
    }
    const id = `assign-${Date.now()}`;
    dispatch(
      addWorkerAssignment({
        id,
        projectId: project?.id,
        workerId: worker?.id,
        description: description.trim(),
        dueDate: dueDate.trim(),
        pay: Number(pay) || 0,
      })
    );
    Alert.alert('Saved', 'Work assigned to worker.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Assign Work</Text>
        <Text style={styles.meta}>Worker: {worker?.name || 'Worker'}</Text>
        <Text style={styles.meta}>Project: {project?.title || 'Project'}</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the work"
        />

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Pay (amount)
        </Text>
        <TextInput
          style={styles.input}
          value={pay}
          onChangeText={setPay}
          keyboardType="numeric"
          placeholder="e.g., 150"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Assign</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  label: { marginTop: 10, color: palette.text, fontWeight: '700' },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: palette.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});

export default AssignWorkScreen;
