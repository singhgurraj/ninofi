import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;