import { Tabs } from 'expo-router';
import React from 'react';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isAdminUser } from '../../src/utils/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const auth = useSelector((state: any) => state.auth || {});
  const isAuthenticated = auth.isAuthenticated === true;
  const isAdmin = isAuthenticated && isAdminUser(auth.user);
  const tabKey = `${isAuthenticated ? auth.user?.id || 'user' : 'guest'}:${isAdmin ? 'admin' : 'user'}`;

  const adminOptions = isAdmin
    ? {
        title: 'Admin',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="shield-checkmark" color={color} size={size ?? 24} />
        ),
      }
    : {
        href: null,
      };

  return (
    <Tabs
      key={tabKey}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: isAuthenticated ? undefined : { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-sharp" color={color} size={size ?? 26} />
          ),
        }}
      />
      <Tabs.Screen name="admin" options={adminOptions} />
      {isAuthenticated && (
        <>
          <Tabs.Screen
            name="invoices"
            options={{
              title: 'Invoices',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" color={color} size={size ?? 24} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="cog-outline" color={color} size={size ?? 24} />
              ),
            }}
          />
        </>
      )}
    </Tabs>
  );
}
