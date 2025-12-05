import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import palette from '../../styles/palette';
import { fetchAdminUsers, resolveDispute } from '../../services/admin';

const AdminModerationScreen = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await fetchAdminUsers();
      if (res.success) setUsers(res.data || []);
    })();
  }, []);

  const handleSuspend = async (userId) => {
    const res = await resolveDispute(userId, 'suspended'); // placeholder; backend status is audit only
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to suspend');
      return;
    }
    Alert.alert('Updated', 'User suspension recorded.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>User Moderation</Text>
        {users.length === 0 ? (
          <Text style={styles.muted}>No users.</Text>
        ) : (
          users.map((u) => (
            <View key={u.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{u.fullName}</Text>
                <Text style={styles.meta}>{u.email}</Text>
                <Text style={styles.meta}>{u.role}</Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={() => handleSuspend(u.id)}>
                <Text style={styles.buttonText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: palette.text },
  muted: { color: palette.muted },
  row: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: { fontWeight: '700', color: palette.text },
  meta: { color: palette.muted },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});

export default AdminModerationScreen;
