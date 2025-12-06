import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';

const TAGS = ['Electrician', 'Plumbing', 'Roofing', 'Carpentry', 'HVAC', 'Painting', 'Labor'];

const PostWorkScreen = ({ route, navigation }) => {
  const { project } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pay, setPay] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.muted}>Project not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !workDate.trim()) {
      Alert.alert('Missing info', 'Title, description, and date are required');
      return;
    }
    const payNum = Number(pay);
    if (pay && (!Number.isFinite(payNum) || payNum < 0)) {
      Alert.alert('Invalid pay', 'Pay must be a number');
      return;
    }
    setLoading(true);
    try {
      await projectAPI.postWorkGig(project.id, {
        contractorId: user?.id,
        title: title.trim(),
        description: description.trim(),
        workDate,
        pay: pay ? payNum : null,
        tags: selectedTags,
      });
      Alert.alert('Posted', 'Work posted for workers to apply.');
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to post work';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const quickDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setWorkDate(d.toISOString().split('T')[0]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Post Work</Text>
        <Text style={styles.meta}>Project: {project.title}</Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Electrical rough-in"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the work"
        />

        <Text style={styles.label}>Date</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            value={workDate}
            onChangeText={setWorkDate}
            placeholder="YYYY-MM-DD"
          />
          <TouchableOpacity style={styles.dateChip} onPress={() => quickDate(0)}>
            <Text style={styles.dateChipText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateChip} onPress={() => quickDate(1)}>
            <Text style={styles.dateChipText}>Tomorrow</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Pay (optional)</Text>
        <TextInput
          style={styles.input}
          value={pay}
          onChangeText={setPay}
          keyboardType="numeric"
          placeholder="e.g., 150"
        />

        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsRow}>
          {TAGS.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selected && styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, selected && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.saveText}>{loading ? 'Posting…' : 'Post Work'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  label: { marginTop: 4, color: palette.text, fontWeight: '700' },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: 12,
    color: palette.text,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1 },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  dateChipText: { color: palette.text, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tagChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  tagText: { color: palette.text },
  tagTextActive: { color: '#fff', fontWeight: '700' },
  saveButton: {
    marginTop: 12,
    backgroundColor: palette.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  muted: { color: palette.muted },
});

export default PostWorkScreen;
