import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { apiClient } from '../lib/api';
import { signOut } from '../lib/supabase';
import type { Document, Child } from '../types/shared';

interface DashboardScreenProps {
  onLogout: () => void;
  onNavigateToUpload: () => void;
  onNavigateToDocument: (documentId: string) => void;
  onNavigateToChildren: () => void;
}

export default function DashboardScreen({
  onLogout,
  onNavigateToUpload,
  onNavigateToDocument,
  onNavigateToChildren,
}: DashboardScreenProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [docsResult, childrenResult] = await Promise.all([
        apiClient.getDocuments(selectedChildId),
        apiClient.getChildren(),
      ]);

      if (docsResult.data) {
        setDocuments(docsResult.data);
      }

      if (childrenResult.data) {
        setChildren(childrenResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedChildId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            onLogout();
          },
        },
      ]
    );
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => onNavigateToDocument(item.id)}
      testID={`card-document-${item.id}`}
    >
      <View style={styles.documentHeader}>
        <Text style={styles.documentTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.documentType}>{item.docType}</Text>
      
      {item.dueDate && (
        <Text style={styles.dueDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      )}
      
      {item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderChildFilter = ({ item }: { item: Child }) => (
    <TouchableOpacity
      style={[
        styles.childButton,
        selectedChildId === item.id && styles.childButtonSelected,
      ]}
      onPress={() => setSelectedChildId(selectedChildId === item.id ? undefined : item.id)}
      testID={`button-child-${item.id}`}
    >
      <Text
        style={[
          styles.childButtonText,
          selectedChildId === item.id && styles.childButtonTextSelected,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading your documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SchoolVault</Text>
        <TouchableOpacity onPress={handleLogout} testID="button-logout">
          <Text style={styles.logoutButton}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {children.length > 0 && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Filter by child:</Text>
          <FlatList
            horizontal
            data={children}
            renderItem={renderChildFilter}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            style={styles.childrenList}
          />
        </View>
      )}

      <View style={styles.actionBar}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={onNavigateToUpload}
            testID="button-upload"
          >
            <Text style={styles.uploadButtonText}>+ Upload Document</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.childrenButton}
            onPress={onNavigateToChildren}
            testID="button-manage-children"
          >
            <Text style={styles.childrenButtonText}>👨‍👩‍👧‍👦 Manage Children</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.documentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "Upload Document" to get started
            </Text>
          </View>
        }
      />
    </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  logoutButton: {
    color: '#ef4444',
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  childrenList: {
    marginVertical: 4,
  },
  childButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  childButtonSelected: {
    backgroundColor: '#2563eb',
  },
  childButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  childButtonTextSelected: {
    color: 'white',
  },
  actionBar: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  childrenButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  childrenButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  documentsList: {
    padding: 16,
  },
  documentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusprocessing: {
    backgroundColor: '#fbbf24',
  },
  statusprocessed: {
    backgroundColor: '#10b981',
  },
  statusfailed: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  documentType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});