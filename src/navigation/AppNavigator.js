import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
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
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;