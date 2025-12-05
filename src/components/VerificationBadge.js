/**
 * VerificationBadge - tiny status pill used throughout onboarding/verification flows.
 * Accepts semantic status keys and renders appropriate icon/text colors.
 */
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

/**
 * Convert hex color to rgba string so we can render translucent backgrounds.
 */
const hexToRgba = (hex, alpha = 1) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * @param {{ status?: keyof typeof STATUS_CONFIG }} props
 * status - semantic key describing verification state.
 */
const VerificationBadge = ({ status = 'unverified' }) => {
  // Fallback to unverified to avoid runtime errors when unknown strings arrive
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: '100%',
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default VerificationBadge;
