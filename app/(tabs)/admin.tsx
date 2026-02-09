import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import AdminTasksScreen from '../../src/screens/admin/AdminTasksScreen';
import AdminDashboardScreen from '../../src/screens/admin/AdminDashboardScreen';
import AdminModerationScreen from '../../src/screens/admin/AdminModerationScreen';
import { isAdminUser } from '../../src/utils/auth';

const Stack = createStackNavigator();

export default function AdminTab() {
  const auth = useSelector((state: any) => state.auth || {});
  const isAuthenticated = auth.isAuthenticated === true;
  const isAdmin = isAuthenticated && isAdminUser(auth.user);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.replace('/(tabs)');
    }
  }, [isAdmin, isAuthenticated]);

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTasks" component={AdminTasksScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
    </Stack.Navigator>
  );
}
