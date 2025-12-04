import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Dashboard screens
import ContractorDashboard from '../screens/contractor/ContractorDashboard';
import DocumentUploadScreen from '../screens/contractor/DocumentUploadScreen';
import SelfieVerificationScreen from '../screens/contractor/SelfieVerificationScreen';
import VerificationScreen from '../screens/contractor/VerificationScreen';
import HomeownerDashboard from '../screens/homeowner/HomeownerDashboard';
import WorkerDashboard from '../screens/worker/WorkerDashboard';
import ExpenseTrackingScreen from '../screens/contractor/ExpenseTrackingScreen';
import PayrollTrackingScreen from '../screens/contractor/PayrollTrackingScreen';

// Homeowner screens
import SubmitMilestoneScreen from '../screens/contractor/SubmitMilestoneScreen';
import CreateProjectScreen from '../screens/homeowner/CreateProjectScreen';
import FundProjectScreen from '../screens/homeowner/FundProjectScreen';
import ProjectDetailsScreen from '../screens/homeowner/ProjectDetailsScreen';
import ReviewMilestoneScreen from '../screens/homeowner/ReviewMilestoneScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import WalletScreen from '../screens/shared/WalletScreen';
import ContractsScreen from '../screens/shared/ContractsScreen';
import ContractDetailsScreen from '../screens/shared/ContractDetailsScreen';
import ProjectsListScreen from '../screens/homeowner/ProjectsListScreen';
import FindJobsScreen from '../screens/contractor/FindJobsScreen';
import ContractorProjectDetailsScreen from '../screens/contractor/ContractorProjectDetailsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import NotificationDetailScreen from '../screens/shared/NotificationDetailScreen';
import ApplicationsScreen from '../screens/contractor/ApplicationsScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ProjectOverviewScreen from '../screens/shared/ProjectOverviewScreen';
import ProjectPersonnelScreen from '../screens/shared/ProjectPersonnelScreen';
import RegisterWorkerScreen from '../screens/contractor/RegisterWorkerScreen';
import ProjectPersonnelAddScreen from '../screens/shared/ProjectPersonnelAddScreen';
import { setAuthToken } from '../services/api';

const RootStack = createStackNavigator();
const MainStack = createStackNavigator();

const AppNavigator = () => {
  const auth = useSelector((state) => state.auth);
  const { isAuthenticated, role } = auth;

  useEffect(() => {
    if (isAuthenticated && auth?.token) {
      setAuthToken(auth.token);
    }
  }, [isAuthenticated, auth?.token]);

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

const MainAppStack = () => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen
        name="Dashboard"
        component={DashboardComponent}
        options={{ title: 'Home' }}
      />
      <MainStack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{ title: 'Create Project' }}
      />
      <MainStack.Screen
        name="ProjectDetails"
        component={ProjectDetailsScreen}
        options={{ title: 'Project Details' }}
      />
      <MainStack.Screen
        name="ProjectsList"
        component={ProjectsListScreen}
        options={{ title: 'All Projects' }}
      />
      <MainStack.Screen
        name="FindJobs"
        component={FindJobsScreen}
        options={{ title: 'Find Jobs' }}
      />
      <MainStack.Screen
        name="ContractorProjectDetails"
        component={ContractorProjectDetailsScreen}
        options={{ title: 'Project Details' }}
      />
      <MainStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <MainStack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ title: 'Request' }}
      />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
      <MainStack.Screen
        name="ProjectOverview"
        component={ProjectOverviewScreen}
        options={{ title: 'Project Overview' }}
      />
      <MainStack.Screen
        name="ProjectPersonnel"
        component={ProjectPersonnelScreen}
        options={{ title: 'Personnel' }}
      />
      <MainStack.Screen
        name="ProjectPersonnelAdd"
        component={ProjectPersonnelAddScreen}
        options={{ title: 'Add Personnel' }}
      />
      <MainStack.Screen
        name="RegisterWorker"
        component={RegisterWorkerScreen}
        options={{ title: 'Register Worker' }}
      />
      <MainStack.Screen
        name="Applications"
        component={ApplicationsScreen}
        options={{ title: 'My Applications' }}
      />
      <MainStack.Screen
        name="FundProject"
        component={FundProjectScreen}
        options={{ title: 'Fund Project' }}
      />
      <MainStack.Screen
        name="ReviewMilestone"
        component={ReviewMilestoneScreen}
        options={{ title: 'Review Milestone' }}
      />
      <MainStack.Screen
        name="SubmitMilestone"
        component={SubmitMilestoneScreen}
        options={{ title: 'Submit Milestone' }}
      />
      <MainStack.Screen
        name="Verification"
        component={VerificationScreen}
        options={{ title: 'Account Verification' }}
      />
      <MainStack.Screen
        name="DocumentUpload"
        component={DocumentUploadScreen}
        options={{ title: 'Upload Document' }}
      />
      <MainStack.Screen
        name="SelfieVerification"
        component={SelfieVerificationScreen}
        options={{ title: 'Selfie Verification' }}
      />
      <MainStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <MainStack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ title: 'Wallet' }}
      />
      <MainStack.Screen
        name="ExpenseTracking"
        component={ExpenseTrackingScreen}
        options={{ title: 'Expense Tracking' }}
      />
      <MainStack.Screen
        name="PayrollTracking"
        component={PayrollTrackingScreen}
        options={{ title: 'Payroll Tracking' }}
      />
      <MainStack.Screen
        name="Contracts"
        component={ContractsScreen}
        options={{ title: 'Contracts' }}
      />
      <MainStack.Screen
        name="ContractDetails"
        component={ContractDetailsScreen}
        options={{ title: 'Contract Details' }}
      />
    </MainStack.Navigator>
  );

  return (
    <RootStack.Navigator
      key={isAuthenticated ? 'app-stack' : 'auth-stack'}
      initialRouteName={isAuthenticated ? 'MainApp' : 'Welcome'}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {!isAuthenticated ? (
        <>
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <RootStack.Screen name="MainApp" component={MainAppStack} />
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator;
