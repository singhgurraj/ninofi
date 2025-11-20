import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DocumentCard from '../../components/DocumentCard';
import VerificationBadge from '../../components/VerificationBadge';
import palette from '../../styles/palette';

const TOTAL_REQUIREMENTS = 4;

const VerificationScreen = ({ navigation }) => {
  const [documents] = useState({
    governmentId: {
      uploaded: true,
      status: 'approved',
      imageUri: 'https://via.placeholder.com/200x200/EDE7FF/7E4DFF?text=ID',
    },
    contractorLicense: {
      uploaded: true,
      status: 'uploaded',
      imageUri: 'https://via.placeholder.com/200x200/E3F2FD/1976D2?text=License',
    },
    insuranceCertificate: {
      uploaded: false,
      status: 'uploaded',
      imageUri: null,
    },
  });

  const [selfieStatus] = useState({
    taken: false,
    status: 'pending',
  });

  const uploadedCount = useMemo(() => {
    let count = 0;
    Object.values(documents).forEach((doc) => {
      if (doc.uploaded) count += 1;
    });
    if (selfieStatus.taken) count += 1;
    return count;
  }, [documents, selfieStatus]);

  const progress = uploadedCount / TOTAL_REQUIREMENTS;

  const overallStatus = useMemo(() => {
    const docStatuses = [
      documents.governmentId.status,
      documents.contractorLicense.status,
      documents.insuranceCertificate.status,
    ];

    if (
      docStatuses.every((status) => status === 'approved') &&
      selfieStatus.status === 'approved' &&
      selfieStatus.taken
    ) {
      return 'verified';
    }

    const allStatuses = [...docStatuses, selfieStatus.status];
    if (allStatuses.some((status) => status === 'rejected')) {
      return 'rejected';
    }

    if (uploadedCount === 0) {
      return 'unverified';
    }

    return 'pending';
  }, [documents, selfieStatus, uploadedCount]);

  const statusMessage = useMemo(() => {
    switch (overallStatus) {
      case 'verified':
        return "Account verified! You're ready to take on new projects.";
      case 'rejected':
        return 'Some documents need attention. Please review and resubmit.';
      case 'unverified':
        return 'Upload the required documents to start getting verified.';
      default:
        return 'Your documents are under review. We will notify you once verification is complete.';
    }
  }, [overallStatus]);

  const documentList = [
    {
      key: 'governmentId',
      label: 'Government ID',
    },
    {
      key: 'contractorLicense',
      label: 'Contractor License',
    },
    {
      key: 'insuranceCertificate',
      label: 'Insurance Certificate',
    },
  ];

  const handleUploadPress = (documentType) => {
    navigation.navigate('DocumentUpload', { documentType });
  };

  const handleSelfiePress = () => {
    navigation.navigate('SelfieVerification');
  };

  const renderUploadCard = (label, documentKey) => (
    <TouchableOpacity
      key={documentKey}
      style={styles.uploadCard}
      activeOpacity={0.9}
      onPress={() => handleUploadPress(label)}
    >
      <View style={styles.uploadIconWrapper}>
        <Text style={styles.uploadIcon}>＋</Text>
      </View>
      <View style={styles.uploadInfo}>
        <Text style={styles.uploadLabel}>{label}</Text>
        <Text style={styles.uploadDescription}>
          Upload your {label.toLowerCase()} to verify this requirement.
        </Text>
      </View>
      <Text style={styles.uploadAction}>Upload</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Account Verification</Text>
            <Text style={styles.subtitle}>Secure your payouts and boost homeowner trust.</Text>
          </View>
          <VerificationBadge status={overallStatus} />
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Verification progress</Text>
            <Text style={styles.progressCount}>{uploadedCount}/{TOTAL_REQUIREMENTS} Documents Uploaded</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          {documentList.map((item) => {
            const doc = documents[item.key];
            if (doc.uploaded) {
              return (
                <DocumentCard
                  key={item.key}
                  documentType={item.label}
                  imageUri={doc.imageUri}
                  status={doc.status}
                  onPress={() => handleUploadPress(item.label)}
                />
              );
            }
            return renderUploadCard(item.label, item.key);
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Selfie</Text>
          <View style={styles.selfieCard}>
            <View style={styles.selfieInfo}>
              <Text style={styles.selfieLabel}>Take a quick selfie</Text>
              <Text style={styles.selfieDescription}>
                Match your face to your government ID. Make sure you are in a well-lit area.
              </Text>
              <VerificationBadge
                status={
                  selfieStatus.taken
                    ? selfieStatus.status === 'approved'
                      ? 'verified'
                      : selfieStatus.status === 'rejected'
                        ? 'rejected'
                        : 'pending'
                    : 'unverified'
                }
              />
            </View>
            <TouchableOpacity style={styles.selfieButton} onPress={handleSelfiePress}>
              <Text style={styles.selfieButtonIcon}>🤳</Text>
              <Text style={styles.selfieButtonText}>
                {selfieStatus.taken ? 'Retake Selfie' : 'Take Selfie'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: palette.muted,
  },
  progressCard: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 24,
    shadowColor: '#3B2A68',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  progressCount: {
    fontSize: 14,
    color: palette.muted,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8DEFF',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: palette.primary,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: palette.text,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#3B2A68',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  uploadIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F4ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  uploadIcon: {
    fontSize: 24,
    color: palette.primary,
  },
  uploadInfo: {
    flex: 1,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 4,
  },
  uploadDescription: {
    fontSize: 13,
    color: palette.muted,
  },
  uploadAction: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primary,
  },
  selfieCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    shadowColor: '#3B2A68',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  selfieInfo: {
    marginBottom: 16,
    gap: 8,
  },
  selfieLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  selfieDescription: {
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20,
  },
  selfieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.primary,
  },
  selfieButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  selfieButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statusMessage: {
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20,
  },
});

export default VerificationScreen;
