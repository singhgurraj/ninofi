import palette from './palette';

export const shadowCard = {
  backgroundColor: palette.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  shadowColor: '#3B2A68',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

export const glassCard = {
  ...shadowCard,
  padding: 16,
};

export const pillButton = {
  backgroundColor: '#FFFFFF',
  borderColor: palette.primary,
  borderWidth: 1.5,
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 16,
  alignItems: 'center',
  justifyContent: 'center',
};

export const pillButtonText = {
  color: palette.primary,
  fontWeight: '700',
  fontSize: 15,
};

export const subtleText = {
  color: palette.muted,
};

export const heading = {
  color: palette.text,
  fontWeight: '700',
};
