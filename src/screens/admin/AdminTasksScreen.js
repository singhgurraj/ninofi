import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import palette from '../../styles/palette';
import { decideAdminTask, fetchAdminPendingTasks } from '../../services/admin';

const TaskCard = ({ task, onDecision }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDecision = async (decision) => {
    setLoading(true);
    const res = await decideAdminTask(task.id, decision, message);
    setLoading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to update task');
      return;
    }
    onDecision(task.id);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.meta}>${(task.escrowAmountCents / 100).toFixed(2)} • {task.status}</Text>
      {task.description ? <Text style={styles.body}>{task.description}</Text> : null}
      <Text style={styles.meta}>Creator: {task.creator?.name || 'Unknown'} ({task.creator?.email})</Text>
      <Text style={styles.meta}>Worker: {task.worker?.name || 'Unassigned'} {task.worker?.email ? `(${task.worker.email})` : ''}</Text>
      {task.proofImageUrl ? (
        <Image source={{ uri: task.proofImageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <Text style={styles.muted}>No proof image provided.</Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Add an optional note"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.button, styles.deny]}
          onPress={() => handleDecision('DENY')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? '...' : 'Deny'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.approve]}
          onPress={() => handleDecision('APPROVE')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? '...' : 'Approve'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AdminTasksScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminPendingTasks();
    if (res.success) {
      setTasks(res.data);
    } else {
      setTasks([]);
      setError(res.error || 'Unable to load tasks');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleDecisionRemove = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Admin Task Review</Text>
        {loading && <Text style={styles.muted}>Loading…</Text>}
        {!loading && error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && tasks.length === 0 && (
          <Text style={styles.muted}>No tasks pending review.</Text>
        )}
        {!loading && !error && tasks.length > 0
          ? tasks.map((task) => (
              <TaskCard key={task.id} task={task} onDecision={handleDecisionRemove} />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 18, gap: 12, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: '800', color: palette.text },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '800', color: palette.text },
  meta: { color: palette.muted, fontSize: 13 },
  body: { color: palette.text, fontSize: 14 },
  image: { width: '100%', height: 180, borderRadius: 12, backgroundColor: palette.border },
  muted: { color: palette.muted, fontSize: 14 },
  error: { color: '#EF4444', fontSize: 14 },
  input: {
    backgroundColor: '#f7f7f9',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 44,
    color: palette.text,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  deny: { backgroundColor: '#fee2e2' },
  approve: { backgroundColor: '#d1fae5' },
  buttonText: { fontWeight: '800', color: palette.text },
});

export default AdminTasksScreen;
