import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase, getCurrentUser } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import UploadScreen from './screens/UploadScreen';
import DocumentDetailScreen from './screens/DocumentDetailScreen';
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

type Screen = 'loading' | 'auth' | 'dashboard' | 'upload' | 'document';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');

  useEffect(() => {
    initializeApp();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setCurrentScreen('dashboard');
        loadChildren();
      } else if (event === 'SIGNED_OUT') {
        setCurrentScreen('auth');
        setChildren([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeApp = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentScreen('dashboard');
        await loadChildren();
      } else {
        setCurrentScreen('auth');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setCurrentScreen('auth');
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

  const handleAuthSuccess = () => {
    setCurrentScreen('dashboard');
    loadChildren();
  };

  const handleLogout = () => {
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
