import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import palette from '../styles/palette';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://ninofi-production.up.railway.app/api';
console.log('API_BASE:', API_BASE);

/**
 * GPS check-in button for contractors/workers.
 * Matches the NINOFI design language (card surface, shadows, primary button).
 */
const CheckInButton = ({ projectId, userId, userType, onCheckInSuccess }) => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [lastDistance, setLastDistance] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      if (!projectId || !userId) {
        setStatusLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/check-in-status/${projectId}/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        if (!isMounted) return;
        setAlreadyCheckedIn(!!data.checkedIn);
        setLastDistance(
          typeof data.distance === 'number' && !Number.isNaN(data.distance) ? data.distance : null
        );
      } catch (error) {
        if (isMounted) {
          setAlreadyCheckedIn(false);
          setLastDistance(null);
        }
      } finally {
        if (isMounted) setStatusLoading(false);
      }
    };

    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [projectId, userId]);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission is required to check in.');
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = position?.coords;
    if (!coords?.latitude || !coords?.longitude) {
      throw new Error('Unable to read current location.');
    }
    return coords;
  };

  const handleCheckIn = async () => {
    if (!projectId || !userId) {
      Alert.alert('Missing info', 'Project and user are required to check in.');
      return;
    }
    try {
      setSubmitting(true);
      const coords = await requestLocation();

      const res = await fetch(`${API_BASE}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          userType,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        if (res.status === 403) {
          Alert.alert(
            'Too far from job site',
            `You are ${Math.round(data?.distance ?? 0)}m away (allowed ${data?.allowedRadius ?? 'N/A'}m).`
          );
        } else {
          Alert.alert('Check-in failed', data?.message || 'Unable to complete check-in.');
        }
        return;
      }

      const dist = typeof data?.distance === 'number' ? data.distance : null;
      setAlreadyCheckedIn(true);
      setLastDistance(dist);
      Alert.alert(
        'Check-in recorded',
        dist !== null
          ? `You checked in successfully (${Math.round(dist)}m from site).`
          : 'You checked in successfully.'
      );
      if (typeof onCheckInSuccess === 'function') {
        onCheckInSuccess(data);
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Unable to complete check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderButtonContent = () => {
    if (statusLoading || submitting) {
      return (
        <>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={[styles.buttonText, styles.buttonTextSpacer]}>Getting location...</Text>
        </>
      );
    }
    if (alreadyCheckedIn) {
      return <Text style={styles.buttonText}>✓ Checked In Today</Text>;
    }
    return <Text style={styles.buttonText}>Check In at Job Site</Text>;
  };

  const buttonStyle = [
    styles.button,
    (statusLoading || submitting) && styles.buttonDisabled,
    alreadyCheckedIn && styles.buttonSuccess,
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>GPS Check-In</Text>
      <Text style={styles.subtitle}>
        Verify you’re on-site to log today’s attendance and unlock payments.
      </Text>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handleCheckIn}
        disabled={statusLoading || submitting || alreadyCheckedIn}
      >
        {renderButtonContent()}
      </TouchableOpacity>
      {alreadyCheckedIn && lastDistance !== null ? (
        <Text style={styles.metaText}>
          Last check-in distance: {Math.round(lastDistance)}m from job site.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.text,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    marginBottom: 6,
  },
  button: {
    marginTop: 6,
    backgroundColor: palette.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: palette.border,
  },
  buttonSuccess: {
    backgroundColor: palette.success,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonTextSpacer: {
    marginLeft: 6,
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
});

export default CheckInButton;
