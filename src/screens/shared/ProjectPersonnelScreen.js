import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { projectAPI } from '../../services/api';

const buildPersonnel = (project) => {
  const people = [];
  if (project?.owner) {
    people.push({
      id: project.owner.id,
      name: project.owner.fullName,
      role: 'owner',
      email: project.owner.email,
      phone: project.owner.phone,
      photo: project.owner.profilePhotoUrl,
    });
  }
  if (project?.assignedContractor) {
    people.push({
      id: project.assignedContractor.id,
      name: project.assignedContractor.fullName,
      role: 'contractor',
      email: project.assignedContractor.email,
      phone: project.assignedContractor.phone,
      photo: project.assignedContractor.profilePhotoUrl,
    });
  }

  const order = ['owner', 'contractor', 'subcontractor', 'foreman', 'laborer'];
  return people.sort(
    (a, b) => order.indexOf(a.role || 'laborer') - order.indexOf(b.role || 'laborer')
  );
};

const roleLabel = (role) => {
  switch ((role || '').toLowerCase()) {
    case 'owner':
      return 'Homeowner';
    case 'contractor':
      return 'General Contractor';
    case 'subcontractor':
      return 'Subcontractor';
    case 'foreman':
      return 'Foreman';
    default:
      return 'Laborer';
  }
};

const ProjectPersonnelScreen = ({ route, navigation }) => {
  const { project, role = 'homeowner' } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const isContractor = user?.role === 'contractor';

  const toggleSelect = (id) => setSelectedId((prev) => (prev === id ? null : id));

  const loadPeople = useCallback(async () => {
    if (!project?.id || !user?.id) return;
    setIsLoading(true);
    try {
      const res = await projectAPI.getProjectPersonnel(project.id, user.id);
      const rows = res.data || [];
      let baseProject = project;
      if (!project.assignedContractor || !project.owner) {
        try {
          const details = await projectAPI.getProjectDetails(project.id);
          baseProject = details.data || project;
        } catch {}
      }
      const base = buildPersonnel(baseProject);
      const merged = [
        ...base,
        ...rows.map((r) => ({
          id: r.user?.id || r.userId,
          name: r.user?.fullName,
          role: r.role,
          email: r.user?.email,
          phone: r.user?.phone,
          photo: r.user?.profilePhotoUrl,
        })),
      ];
      const deduped = [];
      const seen = new Set();
      merged.forEach((p) => {
        if (!p?.id) return;
        if (seen.has(p.id)) return;
        if (user.id === p.id) return; // hide own card
        seen.add(p.id);
        deduped.push(p);
      });
      const order = ['owner', 'contractor', 'subcontractor', 'foreman', 'laborer', 'worker'];
      const rank = (r) => {
        const idx = order.indexOf((r || '').toLowerCase());
        return idx === -1 ? order.length : idx;
      };
      deduped.sort((a, b) => rank(a.role) - rank(b.role));
      setPeople(deduped);
    } catch (error) {
      console.log('personnel:load:error', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  }, [project, user?.id]);

  const handleRemove = async (personId) => {
    if (!project?.id || !user?.id || !personId) return;
    Alert.alert('Remove person', 'Remove this person from the project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await projectAPI.deleteProjectPersonnel(project.id, personId, { userId: user.id });
            await loadPeople();
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to remove');
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      loadPeople();
    }, [loadPeople])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Project Personnel</Text>
          </View>
          {isContractor ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                navigation.navigate('ProjectPersonnelAdd', {
                  project,
                  role,
                })
              }
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {people.map((person) => {
          const isSelected = selectedId === person.id;
          return (
            <TouchableOpacity
              key={person.id}
              style={[styles.card, isSelected ? styles.cardActive : null]}
              onPress={() => toggleSelect(person.id)}
              activeOpacity={0.9}
            >
              <View style={styles.cardTop}>
                {person.photo ? (
                  <Image source={{ uri: person.photo }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{person.name?.[0] || '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{person.name}</Text>
                  <Text style={styles.role}>{roleLabel(person.role)}</Text>
                </View>
                <Text style={styles.chevron}>{isSelected ? '▲' : '▼'}</Text>
              </View>
              {isSelected && (
                <View style={styles.details}>
                  <Text style={styles.detailText}>Email: {person.email || 'N/A'}</Text>
                  <Text style={styles.detailText}>Phone: {person.phone || 'N/A'}</Text>
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        project,
                        receiver: {
                          id: person.id,
                          fullName: person.name,
                          email: person.email,
                          role: person.role,
                        },
                      })
                    }
                  >
                    <Text style={styles.messageText}>Message</Text>
                  </TouchableOpacity>
                  {isContractor ? (
                    <>
                      {String(person.role || '').toLowerCase() === 'worker' ? (
                        <TouchableOpacity
                          style={styles.assignButton}
                          onPress={() =>
                            navigation.navigate('AssignWork', {
                              project,
                              worker: person,
                            })
                          }
                        >
                          <Text style={styles.assignText}>Assign Work</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemove(person.id)}
                      >
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                  {!isContractor ? (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemove(person.id)}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 22, gap: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    padding: 4,
  },
  backText: { fontSize: 24, color: palette.text },
  title: { fontSize: 22, fontWeight: '800', color: palette.text },
  subtitle: { color: palette.muted, fontSize: 14 },
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
    elevation: 4,
    marginBottom: 4,
  },
  cardActive: { borderColor: palette.primary, shadowOpacity: 0.12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#eee' },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E8EAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontWeight: '800', color: palette.primary, fontSize: 18 },
  name: { fontSize: 17, fontWeight: '700', color: palette.text },
  role: { color: palette.muted, fontSize: 13 },
  chevron: { color: palette.muted, fontWeight: '700', fontSize: 16 },
  details: { marginTop: 12, gap: 8 },
  detailText: { color: palette.text, fontSize: 14, lineHeight: 20 },
  messageButton: {
    marginTop: 8,
    backgroundColor: palette.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  messageText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  assignButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
  },
  assignText: { color: palette.primary, fontWeight: '700', fontSize: 15 },
  removeButton: {
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.error || '#E45858',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
  removeText: { color: palette.error || '#E45858', fontWeight: '700', fontSize: 15 },
  addButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  muted: { color: palette.muted, fontSize: 14 },
});

export default ProjectPersonnelScreen;
