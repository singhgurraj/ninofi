import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import palette from '../../styles/palette';
import { fetchContractsForProject } from '../../services/contracts';

const ProjectOverviewScreen = ({ route, navigation }) => {
  const { project, role = 'homeowner' } = route.params || {};
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState(null);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Project not found.</Text>
      </SafeAreaView>
    );
  }

  const milestones = project.milestones || [];
  const progress = milestones.length
    ? Math.round(
        (milestones.filter((m) => m.status === 'approved' || m.status === 'completed').length /
          milestones.length) *
          100
      )
    : 0;

  const handleEdit = () => {
    if (role === 'homeowner') {
      navigation.navigate('CreateProject', { project, origin: 'Dashboard' });
    }
  };

  const goPersonnel = () => {
    navigation.navigate('ProjectPersonnel', { project, role });
  };

  const handleProposeContract = () => {
    navigation.navigate('ContractWizard', { project, role });
  };

  const loadContracts = useCallback(async () => {
    if (!project?.id) return;
    setContractsLoading(true);
    setContractsError(null);
    const res = await fetchContractsForProject(project.id);
    if (res.success) {
      setContracts(res.data || []);
    } else {
      setContractsError(res.error || 'Failed to load contracts');
    }
    setContractsLoading(false);
  }, [project?.id]);

  useFocusEffect(
    useCallback(() => {
      loadContracts();
    }, [loadContracts])
  );

  const isContractor = role === 'contractor';
  const showEdit = role === 'homeowner';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{project.title}</Text>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{project.projectType || 'Project'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.body}>{project.description || 'No description provided.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.detailText}>Address: {project.address || 'Not set'}</Text>
          <Text style={styles.detailText}>
            Budget: ${Number(project.estimatedBudget || 0).toLocaleString()}
          </Text>
          <Text style={styles.detailText}>Timeline: {project.timeline || 'Not set'}</Text>
          {project.owner?.fullName ? (
            <Text style={styles.detailText}>Owner: {project.owner.fullName}</Text>
          ) : null}
          {project.assignedContractor?.fullName ? (
            <Text style={styles.detailText}>
              Contractor: {project.assignedContractor.fullName}
            </Text>
          ) : (
            <Text style={styles.detailText}>Contractor: Unassigned</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          {milestones.length === 0 ? (
            <Text style={styles.muted}>No milestones yet.</Text>
          ) : (
            milestones.map((m, idx) => (
              <View key={m.id || idx} style={styles.milestoneRow}>
                <View style={styles.milestoneBullet} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.milestoneName}>{m.name}</Text>
                  <Text style={styles.milestoneMeta}>
                    {m.status || 'Pending'} • ${Number(m.amount || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contracts</Text>
            {contractsLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          </View>
          {contractsError ? <Text style={styles.errorText}>{contractsError}</Text> : null}
          {!contractsLoading && !contractsError && (!contracts || contracts.length === 0) ? (
            <Text style={styles.muted}>No contracts yet.</Text>
          ) : null}
          {contracts?.map((c) => {
            const statusLabel = (c.status || 'pending').toUpperCase();
            return (
              <View key={c.id} style={styles.contractRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.milestoneName}>{c.title || 'Contract'}</Text>
                  <Text style={styles.milestoneMeta}>
                    Status: {statusLabel}
                    {typeof c.signatureCount === 'number' ? ` • Signatures: ${c.signatureCount}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.button, styles.signButton]}
                  onPress={() => navigation.navigate('ContractSignature', { contract: c })}
                >
                  <Text style={styles.buttonText}>
                    {statusLabel === 'SIGNED' ? 'View' : 'Sign'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={[styles.button, styles.refreshButton]} onPress={loadContracts}>
            <Text style={styles.personnelText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.personnelButton]} onPress={goPersonnel}>
            <Text style={styles.personnelText}>People</Text>
          </TouchableOpacity>
          {showEdit ? (
            <TouchableOpacity style={[styles.button, styles.editButton]} onPress={handleEdit}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.contractButton]}
            onPress={handleProposeContract}
          >
            <Text style={styles.contractText}>Propose Contract</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: '700', color: palette.text, flexShrink: 1 },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  typeText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  body: { color: palette.text, lineHeight: 20 },
  detailText: { color: palette.text, lineHeight: 20 },
  progressBar: {
    height: 8,
    backgroundColor: '#EEE7FF',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: palette.primary },
  progressValue: { color: palette.primary, fontWeight: '700' },
  milestoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 },
  milestoneBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  milestoneName: { fontWeight: '700', color: palette.text },
  milestoneMeta: { color: palette.muted, fontSize: 12 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButton: { backgroundColor: palette.primary },
  personnelButton: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  buttonText: { color: '#fff', fontWeight: '700' },
  personnelText: { color: palette.text, fontWeight: '700' },
  muted: { color: palette.muted },
  contractButton: { backgroundColor: palette.primary },
  contractText: { color: '#fff', fontWeight: '700' },
  contractRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  signButton: { backgroundColor: palette.primary, flexBasis: 110 },
  refreshButton: {
    marginTop: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  errorText: { color: '#c1121f' },
});

export default ProjectOverviewScreen;
