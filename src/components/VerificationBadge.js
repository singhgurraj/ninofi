import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import palette from '../styles/palette';

const STATUS_CONFIG = {
  verified: {
    label: 'Verified',
    icon: '✓',
    color: palette.success,
  },
  pending: {
    label: 'Pending',
    icon: '⏳',
    color: palette.warning,
  },
  rejected: {
    label: 'Rejected',
    icon: '✗',
    color: palette.error,
  },
  unverified: {
    label: 'Upload',
    icon: '!',
    color: palette.textSecondary,
  },
};

const hexToRgba = (hex, alpha = 1) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const VerificationBadge = ({ status = 'unverified' }) => {
  const badgeStatus = STATUS_CONFIG[status] || STATUS_CONFIG.unverified;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: hexToRgba(badgeStatus.color, 0.2) },
      ]}
    >
      <Text style={[styles.icon, { color: badgeStatus.color }]}>
        {badgeStatus.icon}
      </Text>
      <Text style={[styles.label, { color: badgeStatus.color }]}>
        {badgeStatus.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default VerificationBadge;
