import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import palette from '../../styles/palette';
import { addWorkerAssignment } from '../../store/projectSlice';
import { projectAPI } from '../../services/api';

const AssignWorkScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const { project, worker } = route.params || {};
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pay, setPay] = useState('');

  const handleSave = async () => {
    if (!description.trim() || !dueDate.trim() || !pay.trim()) {
      Alert.alert('Missing info', 'Please fill description, date, and pay.');
      return;
    }
    try {
      const res = await projectAPI.assignTask(project?.id, {
        workerId: worker?.id,
        description: description.trim(),
        dueDate: dueDate.trim(),
        pay: Number(pay) || 0,
        title: `Work for ${project?.title || 'Project'}`,
      });
      const id = res?.data?.taskId || `assign-${Date.now()}`;
      dispatch(
        addWorkerAssignment({
          id,
          projectId: project?.id,
          workerId: worker?.id,
          description: description.trim(),
          dueDate: dueDate.trim(),
          pay: Number(pay) || 0,
          status: 'ASSIGNED',
        })
      );
      Alert.alert('Saved', 'Work assigned to worker.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to assign work');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Assign Work</Text>
        <View style={styles.metaCard}>
          <Text style={styles.meta}>Worker: {worker?.name || 'Worker'}</Text>
          <Text style={styles.meta}>Project: {project?.title || 'Project'}</Text>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
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
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  metaCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 6,
  },
  meta: { color: palette.muted, fontSize: 14 },
  label: { marginTop: 10, color: palette.text, fontWeight: '700', fontSize: 14 },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: 'top',
    color: palette.text,
    fontSize: 15,
  },
  textArea: { minHeight: 100 },
  saveButton: {
    marginTop: 16,
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default AssignWorkScreen;
