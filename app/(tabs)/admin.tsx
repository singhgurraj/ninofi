import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminTasksScreen from '../../src/screens/admin/AdminTasksScreen';
import AdminDashboardScreen from '../../src/screens/admin/AdminDashboardScreen';
import AdminModerationScreen from '../../src/screens/admin/AdminModerationScreen';

const Stack = createStackNavigator();

export default function AdminTab() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTasks" component={AdminTasksScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
    </Stack.Navigator>
  );
}
