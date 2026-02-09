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
const CheckInButton = ({ projectId, userId, userType, userName, onStatusChange }) => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [checkInId, setCheckInId] = useState(null);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [lastDistance, setLastDistance] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [, setTick] = useState(0);

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
        setCheckInId(data.checkInId || null);
        setCheckInTime(data.checkInTime || null);
        setCheckOutTime(data.checkOutTime || null);
        setDurationSeconds(
          typeof data.durationSeconds === 'number' && !Number.isNaN(data.durationSeconds)
            ? data.durationSeconds
            : null
        );
        setLastDistance(
          typeof data.distance === 'number' && !Number.isNaN(data.distance) ? data.distance : null
        );
        if (typeof onStatusChange === 'function') {
          onStatusChange({
            checkedIn: !!data.checkInId && !data.checkOutTime,
            checkInTime: data.checkInTime,
            checkOutTime: data.checkOutTime,
            durationSeconds: data.durationSeconds,
          });
        }
      } catch (error) {
        if (isMounted) {
          setCheckInId(null);
          setCheckInTime(null);
          setCheckOutTime(null);
          setDurationSeconds(null);
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
  }, [projectId, userId, onStatusChange]);

  useEffect(() => {
    if (checkInTime && !checkOutTime) {
      const interval = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [checkInTime, checkOutTime]);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission is required to check in.');
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
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
          userName,
          clientTimestamp: new Date().toISOString(),
          clientTimeLabel: new Date().toLocaleString(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          action: 'checkin',
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
      setCheckInId(data.checkInId || null);
      setCheckInTime(data.checkInTime || null);
      setCheckOutTime(null);
      setDurationSeconds(null);
      setLastDistance(dist);
      Alert.alert(
        'Check-in recorded',
        dist !== null
          ? `You checked in successfully (${Math.round(dist)}m from site).`
          : 'You checked in successfully.'
      );
      if (typeof onStatusChange === 'function') {
        onStatusChange({
          checkedIn: true,
          checkInTime: data.checkInTime,
          checkOutTime: null,
          durationSeconds: null,
        });
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Unable to complete check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!projectId || !userId || !checkInId) {
      Alert.alert('Missing info', 'No active check-in to check out.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          projectId,
          userId,
          userType,
          userName,
          checkInId,
          clientTimestamp: new Date().toISOString(),
          clientTimeLabel: new Date().toLocaleString(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        Alert.alert('Check-out failed', data?.message || 'Unable to complete check-out.');
        return;
      }
      const dur =
        typeof data?.durationSeconds === 'number' && !Number.isNaN(data.durationSeconds)
          ? data.durationSeconds
          : null;
      setCheckOutTime(data.checkOutTime || null);
      setDurationSeconds(dur);
      setTick((t) => t + 1); // force re-render of timer display
      Alert.alert(
        'Checked out',
        dur
          ? `Worked ${formatDuration(dur)}`
          : 'Check-out recorded.'
      );
      if (typeof onStatusChange === 'function') {
        onStatusChange({
          checkedIn: false,
          checkInTime,
          checkOutTime: data.checkOutTime,
          durationSeconds: dur,
        });
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Unable to complete check-out.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(total / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((total % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = (total % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const elapsedSeconds = (() => {
    if (checkInTime && !checkOutTime) {
      const start = new Date(checkInTime).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - start) / 1000));
    }
    if (durationSeconds != null) return durationSeconds;
    return 0;
  })();

  const renderButtonContent = () => {
    if (statusLoading || submitting) {
      return (
        <>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={[styles.buttonText, styles.buttonTextSpacer]}>Getting location...</Text>
        </>
      );
    }
    if (checkInTime && !checkOutTime) {
      return <Text style={styles.buttonText}>Check Out</Text>;
    }
    return <Text style={styles.buttonText}>Check In at Job Site</Text>;
  };

  const buttonStyle = [
    styles.button,
    (statusLoading || submitting) && styles.buttonDisabled,
    checkInTime && !checkOutTime && styles.buttonSuccess,
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>GPS Check-In</Text>
          <Text style={styles.subtitle}>
            Verify you’re on-site to log today’s attendance and unlock payments.
          </Text>
        </View>
      </View>

      {checkInTime && !checkOutTime ? (
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Time</Text>
          <Text style={styles.timerValue}>{formatDuration(elapsedSeconds)}</Text>
        </View>
      ) : (
        <Text style={styles.mutedText}>No active check-in.</Text>
      )}
      <TouchableOpacity
        style={buttonStyle}
        onPress={checkInTime && !checkOutTime ? handleCheckOut : handleCheckIn}
        disabled={statusLoading || submitting}
      >
        {renderButtonContent()}
      </TouchableOpacity>
      {checkInTime && lastDistance !== null ? (
        <Text style={styles.metaText}>Check-in distance: {Math.round(lastDistance)}m from job site.</Text>
      ) : null}
      {checkOutTime ? (
        <Text style={styles.metaText}>
          Checked out at {new Date(checkOutTime).toLocaleTimeString()} · Worked {formatDuration(elapsedSeconds)}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    marginTop: 4,
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
  mutedText: {
    color: palette.muted,
    fontSize: 13,
  },
  timerRow: {
    marginTop: 6,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerLabel: {
    color: palette.muted,
    fontSize: 13,
  },
  timerValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default CheckInButton;
