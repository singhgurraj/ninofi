import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { projectAPI, userAPI } from '../../services/api';

const ProjectPersonnelAddScreen = ({ route, navigation }) => {
  const { project } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const [workers, setWorkers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWorkers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await userAPI.listWorkers();
      setWorkers(res.data || []);
    } catch (error) {
      console.log('workers:list:error', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const toggleSelect = (id) => {
    if (user?.id && id === user.id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 10) {
          Alert.alert('Limit reached', 'You can add up to 10 people at a time.');
          return next;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (!project?.id || !user?.id) return;
    if (selectedIds.size === 0) {
      Alert.alert('Select people', 'Pick at least one worker to add.');
      return;
    }
    setIsSubmitting(true);
    try {
      await projectAPI.addProjectPersonnel(project.id, {
        userId: user.id,
        people: Array.from(selectedIds).map((id) => ({ userId: id })),
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Add failed', error?.response?.data?.message || 'Could not add personnel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWorker = ({ item }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.workerRow, isSelected ? styles.workerRowActive : null]}
        onPress={() => toggleSelect(item.id)}
        disabled={isSubmitting}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.workerName}>{item.full_name || item.fullName || 'Worker'}</Text>
          <Text style={styles.workerMeta}>{item.email || 'No email'}</Text>
        </View>
        <Text style={styles.checkbox}>{isSelected ? '☑' : '☐'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Personnel</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.subtitle}>Select up to 10 workers to add to this project.</Text>
      </View>
      {isLoading ? (
        <Text style={styles.muted}>Loading workers…</Text>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorker}
          contentContainerStyle={styles.list}
        />
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addButton, selectedIds.size === 0 ? styles.addButtonDisabled : null]}
          onPress={handleAdd}
          disabled={selectedIds.size === 0 || isSubmitting}
        >
          <Text style={styles.addButtonText}>{isSubmitting ? 'Adding…' : 'Add Selected'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  backText: { fontSize: 24, color: palette.text },
  title: { fontSize: 22, fontWeight: '800', color: palette.text },
  body: { paddingHorizontal: 20, paddingVertical: 12 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 22 },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: palette.surface,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  workerRowActive: {
    backgroundColor: '#EEF2FF',
    borderColor: palette.primary,
    shadowOpacity: 0.12,
  },
  workerName: { fontWeight: '700', color: palette.text, fontSize: 16 },
  workerMeta: { color: palette.muted, fontSize: 13, marginTop: 2 },
  checkbox: { fontSize: 20, color: palette.text, marginLeft: 10 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  addButton: {
    backgroundColor: palette.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  muted: { color: palette.muted, paddingHorizontal: 20, fontSize: 14 },
});

export default ProjectPersonnelAddScreen;
