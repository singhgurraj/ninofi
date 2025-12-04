import React, { useCallback, useMemo, useState } from 'react';
import {
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
  const isContractor = role === 'contractor';

  const toggleSelect = (id) => setSelectedId((prev) => (prev === id ? null : id));

  const loadPeople = useCallback(async () => {
    if (!project?.id || !user?.id) return;
    setIsLoading(true);
    try {
      const res = await projectAPI.getProjectPersonnel(project.id, user.id);
      const rows = res.data || [];
      const base = buildPersonnel(project);
      const merged = [...base, ...rows.map((r) => ({
        id: r.user?.id || r.userId,
        name: r.user?.fullName,
        role: r.role,
        email: r.user?.email,
        phone: r.user?.phone,
        photo: r.user?.profilePhotoUrl,
      }))];
      const deduped = [];
      const seen = new Set();
      merged.forEach((p) => {
        if (!p?.id || seen.has(p.id)) return;
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
            <Text style={styles.subtitle}>{project?.title || ''}</Text>
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
                    onPress={() => navigation.navigate('Chat', { project })}
                  >
                    <Text style={styles.messageText}>Message</Text>
                  </TouchableOpacity>
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
  content: { padding: 20, gap: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  backText: { fontSize: 22, color: palette.text },
  title: { fontSize: 20, fontWeight: '700', color: palette.text },
  subtitle: { color: palette.muted },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardActive: { borderColor: palette.primary },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8EAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontWeight: '700', color: palette.primary },
  name: { fontSize: 16, fontWeight: '700', color: palette.text },
  role: { color: palette.muted, fontSize: 12 },
  chevron: { color: palette.muted, fontWeight: '700' },
  details: { marginTop: 10, gap: 6 },
  detailText: { color: palette.text },
  messageButton: {
    marginTop: 6,
    backgroundColor: palette.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  messageText: { color: '#fff', fontWeight: '700' },
  addButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  muted: { color: palette.muted },
});

export default ProjectPersonnelScreen;
