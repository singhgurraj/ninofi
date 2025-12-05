import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';

const WorkerGigsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const { workerAssignments } = useSelector((state) => state.projects);
  const assignments = (workerAssignments || []).filter((a) => a.workerId === user?.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Gigs</Text>
        {(!assignments || assignments.length === 0) && (
          <Text style={styles.muted}>No gigs assigned yet.</Text>
        )}
        {assignments.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('WorkerProject', {
                projectId: item.projectId,
              })
            }
          >
            <Text style={styles.cardTitle}>{item.description || 'Work Item'}</Text>
            <Text style={styles.cardMeta}>Due: {item.dueDate || 'TBD'}</Text>
            <Text style={styles.cardMeta}>Pay: ${Number(item.pay || 0).toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  muted: { color: palette.muted },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 4,
  },
  cardTitle: { fontWeight: '700', color: palette.text },
  cardMeta: { color: palette.muted, fontSize: 12 },
});

export default WorkerGigsScreen;
