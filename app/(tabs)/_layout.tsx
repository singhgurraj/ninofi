import { Tabs } from 'expo-router';
import React from 'react';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useSelector((state: any) => state.auth?.isAuthenticated);
  const userEmail = useSelector((state: any) => state.auth?.user?.email);
  const adminEmails = (Constants.expoConfig?.extra?.adminEmails || process.env.EXPO_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = userEmail ? adminEmails.includes(userEmail.toLowerCase()) : false;

  return (
    <Tabs
      key={isAuthenticated ? 'app-tabs' : 'guest-tabs'}
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
      {isAuthenticated && (
        <>
          <Tabs.Screen
            name="admin"
            options={{
              title: 'Admin',
              href: isAdmin ? undefined : null,
              tabBarButton: isAdmin ? undefined : () => null,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="shield-checkmark" color={color} size={size ?? 24} />
              ),
            }}
          />
          <Tabs.Screen
            name="invoices"
            options={{
              title: 'Invoices',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="document-text-sharp" color={color} size={size ?? 24} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-sharp" color={color} size={size ?? 24} />
              ),
            }}
          />
        </>
      )}
    </Tabs>
  );
}
