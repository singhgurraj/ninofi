/**
 * DocumentCard - preview tile for uploaded verification documents.
 * Shows thumbnail (if available), a badge, and opens upload flow when pressed.
 */
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import palette from '../styles/palette';
import VerificationBadge from './VerificationBadge';

// Map backend status strings to badge variants to keep UI copy centralized
const STATUS_MAP = {
  uploaded: 'pending',
  approved: 'verified',
  rejected: 'rejected',
};

/**
 * @param {{
 *  documentType: string;
 *  imageUri?: string;
 *  status?: 'uploaded' | 'approved' | 'rejected';
 *  onPress?: () => void;
 * }} props
 */
const DocumentCard = ({
  documentType,
  imageUri,
  status = 'uploaded',
  onPress,
}) => {
  // Badge defaults to "Upload" when no status provided
  const badgeStatus = STATUS_MAP[status] || 'unverified';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📄</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.label}>Document</Text>
        <Text style={styles.title}>{documentType}</Text>
        <View style={styles.statusRow}>
          <VerificationBadge status={badgeStatus} />
          <Text style={styles.viewText}>View</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 16,
    shadowColor: '#1c1c1c',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: palette.background,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  placeholderIcon: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: palette.muted,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primary,
  },
});

export default DocumentCard;
