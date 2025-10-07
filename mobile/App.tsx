import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentUser } from './lib/auth';
import { notificationManager } from './lib/notifications';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import UploadScreen from './screens/UploadScreen';
import DocumentDetailScreen from './screens/DocumentDetailScreen';
import ChildrenManagementScreen from './screens/ChildrenManagementScreen';
import { apiClient } from './lib/api';
import type { Child } from './types/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

type Screen = 'loading' | 'auth' | 'dashboard' | 'upload' | 'document' | 'children';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [notificationListeners, setNotificationListeners] = useState<any>(null);

  useEffect(() => {
    initializeApp();

    return () => {
      if (notificationListeners) {
        notificationManager.removeListeners(notificationListeners);
      }
    };
  }, [notificationListeners]);

  const initializeApp = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentScreen('dashboard');
        await loadChildren();
        await setupNotifications(user.id);
      } else {
        setCurrentScreen('auth');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setCurrentScreen('auth');
    }
  };

  const setupNotifications = async (userId: string) => {
    try {
      const initialized = await notificationManager.initialize();
      if (initialized) {
        const listeners = notificationManager.addListeners();
        setNotificationListeners(listeners);
        await notificationManager.registerDevice(userId);
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const cleanupNotifications = async () => {
    try {
      await notificationManager.unregisterDevice();
      await notificationManager.clearAllNotifications();
      if (notificationListeners) {
        notificationManager.removeListeners(notificationListeners);
        setNotificationListeners(null);
      }
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  };

  const loadChildren = async () => {
    try {
      const result = await apiClient.getChildren();
      if (result.data) {
        setChildren(result.data);
      }
    } catch (error) {
      console.error('Error loading children:', error);
    }
  };

  const handleAuthSuccess = async () => {
    setCurrentScreen('dashboard');
    await loadChildren();
    
    // Get current user and setup notifications
    const user = await getCurrentUser();
    if (user) {
      await setupNotifications(user.id);
    }
  };

  const handleLogout = async () => {
    await cleanupNotifications();
    setCurrentScreen('auth');
    setChildren([]);
  };

  const handleNavigateToUpload = () => {
    setCurrentScreen('upload');
  };

  const handleNavigateToDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setCurrentScreen('document');
  };

  const handleNavigateToChildren = () => {
    setCurrentScreen('children');
  };

  const handleGoBackToDashboard = () => {
    setCurrentScreen('dashboard');
    loadChildren(); // Refresh data when going back
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        );
      
      case 'auth':
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
      
      case 'dashboard':
        return (
          <DashboardScreen
            onLogout={handleLogout}
            onNavigateToUpload={handleNavigateToUpload}
            onNavigateToDocument={handleNavigateToDocument}
            onNavigateToChildren={handleNavigateToChildren}
          />
        );
      
      case 'upload':
        return (
          <UploadScreen
            onGoBack={handleGoBackToDashboard}
            children={children}
          />
        );
      
      case 'document':
        return (
          <DocumentDetailScreen
            documentId={selectedDocumentId}
            onGoBack={handleGoBackToDashboard}
          />
        );
      
      case 'children':
        return (
          <ChildrenManagementScreen
            onGoBack={handleGoBackToDashboard}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.container}>
        {renderCurrentScreen()}
        <StatusBar style="auto" />
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
