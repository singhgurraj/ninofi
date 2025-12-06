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
import FeatureFlagsScreen from '../screens/shared/FeatureFlagsScreen';
import SystemMonitoringScreen from '../screens/shared/SystemMonitoringScreen';
import ProjectsListScreen from '../screens/homeowner/ProjectsListScreen';
import FindJobsScreen from '../screens/contractor/FindJobsScreen';
import ContractorProjectsScreen from '../screens/contractor/ContractorProjectsScreen';
import ContractorProjectDetailsScreen from '../screens/contractor/ContractorProjectDetailsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import NotificationDetailScreen from '../screens/shared/NotificationDetailScreen';
import ApplicationsScreen from '../screens/contractor/ApplicationsScreen';
import WorkerGigsScreen from '../screens/worker/WorkerGigsScreen';
import WorkerProjectScreen from '../screens/worker/WorkerProjectScreen';
import WorkerGigApplicationsScreen from '../screens/worker/WorkerGigApplicationsScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ProjectOverviewScreen from '../screens/shared/ProjectOverviewScreen';
import ProjectPersonnelScreen from '../screens/shared/ProjectPersonnelScreen';
import RegisterWorkerScreen from '../screens/contractor/RegisterWorkerScreen';
import ProjectPersonnelAddScreen from '../screens/shared/ProjectPersonnelAddScreen';
import ContractWizardScreen from '../screens/contractor/ContractWizardScreen';
import ContractSignatureScreen from '../screens/contractor/ContractSignatureScreen';
import ContractViewScreen from '../screens/contractor/ContractViewScreen';
import PortfolioScreen from '../screens/contractor/PortfolioScreen';
import PortfolioEditScreen from '../screens/contractor/PortfolioEditScreen';
import ReviewFormScreen from '../screens/homeowner/ReviewFormScreen';
import AuditLogScreen from '../screens/shared/AuditLogScreen';
import ComplianceScreen from '../screens/shared/ComplianceScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminModerationScreen from '../screens/admin/AdminModerationScreen';
import ContractorSearchScreen from '../screens/homeowner/ContractorSearchScreen';
import ContractorProfileScreen from '../screens/homeowner/ContractorProfileScreen';
import AssignWorkScreen from '../screens/contractor/AssignWorkScreen';
import PostWorkScreen from '../screens/contractor/PostWorkScreen';
import BrowseGigsScreen from '../screens/worker/BrowseGigsScreen';
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
        name="ContractorProjects"
        component={ContractorProjectsScreen}
        options={{ title: 'My Projects' }}
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
        name="WorkerGigs"
        component={WorkerGigsScreen}
        options={{ title: 'My Gigs' }}
      />
      <MainStack.Screen
        name="BrowseGigs"
        component={BrowseGigsScreen}
        options={{ title: 'Browse Gigs' }}
      />
      <MainStack.Screen
        name="WorkerGigApplications"
        component={WorkerGigApplicationsScreen}
        options={{ title: 'My Applications' }}
      />
      <MainStack.Screen
        name="WorkerProject"
        component={WorkerProjectScreen}
        options={{ title: 'Project' }}
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
        name="ContractWizard"
        component={ContractWizardScreen}
        options={{ title: 'Micro-Contract' }}
      />
      <MainStack.Screen
        name="ContractSignature"
        component={ContractSignatureScreen}
        options={{ title: 'Sign Contract' }}
      />
      <MainStack.Screen
        name="ContractView"
        component={ContractViewScreen}
        options={{ title: 'View Contract' }}
      />
      <MainStack.Screen
        name="AssignWork"
        component={AssignWorkScreen}
        options={{ title: 'Assign Work' }}
      />
      <MainStack.Screen
        name="PostWork"
        component={PostWorkScreen}
        options={{ title: 'Post Work' }}
      />
      <MainStack.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{ title: 'Portfolio' }}
      />
      <MainStack.Screen
        name="PortfolioEdit"
        component={PortfolioEditScreen}
        options={{ title: 'Edit Portfolio' }}
      />
      <MainStack.Screen
        name="ReviewForm"
        component={ReviewFormScreen}
        options={{ title: 'Leave Review' }}
      />
      <MainStack.Screen
        name="AuditLog"
        component={AuditLogScreen}
        options={{ title: 'Activity' }}
      />
      <MainStack.Screen
        name="Compliance"
        component={ComplianceScreen}
        options={{ title: 'Compliance' }}
      />
      <MainStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Admin' }}
      />
      <MainStack.Screen
        name="AdminModeration"
        component={AdminModerationScreen}
        options={{ title: 'Moderation' }}
      />
      <MainStack.Screen
        name="ContractorSearch"
        component={ContractorSearchScreen}
        options={{ title: 'Find Contractors' }}
      />
      <MainStack.Screen
        name="ContractorProfile"
        component={ContractorProfileScreen}
        options={{ title: 'Contractor Profile' }}
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
        options={{ title: 'My Contracts' }}
      />
      <MainStack.Screen
        name="ContractDetails"
        component={ContractDetailsScreen}
        options={{ title: 'Contract Details' }}
      />
      <MainStack.Screen
        name="FeatureFlags"
        component={FeatureFlagsScreen}
        options={{ title: 'Feature Flags' }}
      />
      <MainStack.Screen
        name="SystemMonitoring"
        component={SystemMonitoringScreen}
        options={{ title: 'System Monitoring' }}
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
