import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import AdminTasksScreen from '../../src/screens/admin/AdminTasksScreen';
import AdminDashboardScreen from '../../src/screens/admin/AdminDashboardScreen';
import AdminModerationScreen from '../../src/screens/admin/AdminModerationScreen';

const Stack = createStackNavigator();

export default function AdminTab() {
  const userEmail = useSelector((state: any) => state.auth?.user?.email);
  const adminEmails = (Constants.expoConfig?.extra?.adminEmails || process.env.EXPO_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = userEmail ? adminEmails.includes(userEmail.toLowerCase()) : false;

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)');
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTasks" component={AdminTasksScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
    </Stack.Navigator>
  );
}
