import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSelector } from 'react-redux';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Dashboard screens
import ContractorDashboard from '../screens/contractor/ContractorDashboard';
import HomeownerDashboard from '../screens/homeowner/HomeownerDashboard';
import WorkerDashboard from '../screens/worker/WorkerDashboard';

// Homeowner screens
import SubmitMilestoneScreen from '../screens/contractor/SubmitMilestoneScreen';
import CreateProjectScreen from '../screens/homeowner/CreateProjectScreen';
import FundProjectScreen from '../screens/homeowner/FundProjectScreen';
import ProjectDetailsScreen from '../screens/homeowner/ProjectDetailsScreen';
import ReviewMilestoneScreen from '../screens/homeowner/ReviewMilestoneScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import WalletScreen from '../screens/shared/WalletScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  // Determine which dashboard to show based on role
  const getDashboardScreen = () => {
  switch (role) {
    case 'homeowner':
      return HomeownerDashboard;
    case 'contractor':
      return ContractorDashboard;
    case 'worker':
      return WorkerDashboard;
    default:
      return HomeownerDashboard;
  }
};

  const DashboardComponent = getDashboardScreen();

  return (
    <Stack.Navigator 
      key={isAuthenticated ? 'app-stack' : 'auth-stack'}
      initialRouteName={isAuthenticated ? "Dashboard" : "Welcome"}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // Main App Stack (AFTER LOGIN)
        <>
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardComponent}
            options={{ title: 'Home' }}
          />
          <Stack.Screen 
            name="CreateProject" 
            component={CreateProjectScreen}
            options={{ title: 'Create Project' }}
          />
          <Stack.Screen 
            name="ProjectDetails" 
            component={ProjectDetailsScreen}
            options={{ title: 'Project Details' }}
          />
          <Stack.Screen 
            name="FundProject" 
            component={FundProjectScreen}
            options={{ title: 'Fund Project' }}
          />
          <Stack.Screen 
            name="ReviewMilestone" 
            component={ReviewMilestoneScreen}
            options={{ title: 'Review Milestone' }}
        />
<Stack.Screen 
  name="SubmitMilestone" 
  component={SubmitMilestoneScreen}
  options={{ title: 'Submit Milestone' }}
/>
<Stack.Screen 
  name="Profile" 
  component={ProfileScreen}
  options={{ title: 'Profile' }}
/>
<Stack.Screen 
  name="Wallet" 
  component={WalletScreen}
  options={{ title: 'Wallet' }}
/>
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
