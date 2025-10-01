import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { apiClient } from '../lib/api';
import { signOut } from '../lib/supabase';
import DailySummaryCard from '../components/DailySummaryCard';
import SwipeableCard from '../components/SwipeableCard';
import TapRipple from '../components/TapRipple';
import ContextualMenu from '../components/ContextualMenu';
import { theme } from '../styles/theme';
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

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

  // Calculate metrics for daily summary
  const today = new Date().toDateString();
  const todayDocuments = documents.filter(
    (doc) => new Date(doc.uploadedAt || '').toDateString() === today
  ).length;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekDocuments = documents.filter(
    (doc) => new Date(doc.uploadedAt || '') >= weekStart
  ).length;

  const processingDocuments = documents.filter(
    (doc) => doc.status === 'processing'
  ).length;

  const renderDocument = (doc: Document, index: number) => (
    <SwipeableCard
      key={doc.id}
      index={index}
      onSwipeLeft={() => {
        // Handle archive/delete
        Alert.alert('Archive', 'Archive this document?');
      }}
      onPress={() => onNavigateToDocument(doc.id)}
    >
      <TapRipple
        onPress={() => onNavigateToDocument(doc.id)}
        testID={`card-document-${doc.id}`}
      >
        <View style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle} numberOfLines={2}>
                {doc.title}
              </Text>
              <View style={styles.documentMeta}>
                <Text style={styles.documentType}>{doc.docType}</Text>
                {doc.dueDate && (
                  <>
                    <Text style={styles.metaDivider}>•</Text>
                    <Text style={styles.dueDate}>
                      Due {new Date(doc.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </>
                )}
              </View>
            </View>
            <View style={[styles.statusBadge, styles[`status${doc.status}`]]}>
              <Text style={styles.statusText}>{doc.status}</Text>
            </View>
          </View>

          {doc.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {doc.tags.slice(0, 3).map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TapRipple>
    </SwipeableCard>
  );

  return (
    <View style={styles.container}>
      {/* Stripe-style header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SchoolVault</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onNavigateToChildren}
            style={styles.iconButton}
            testID="button-manage-children"
          >
            <Text style={styles.iconButtonText}>👨‍👩‍👧‍👦</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => {
              const target = e.nativeEvent;
              setMenuPosition({ x: 0, y: 100 });
              setMenuVisible(true);
            }}
            style={styles.iconButton}
            testID="button-menu"
          >
            <Text style={styles.iconButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Daily Summary */}
        <DailySummaryCard
          todayDocuments={todayDocuments}
          weekDocuments={weekDocuments}
          processingDocuments={processingDocuments}
        />

        {/* Child Filter Pills */}
        {children.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                !selectedChildId && styles.filterPillSelected,
              ]}
              onPress={() => setSelectedChildId(undefined)}
              testID="button-child-all"
            >
              <Text
                style={[
                  styles.filterPillText,
                  !selectedChildId && styles.filterPillTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.filterPill,
                  selectedChildId === child.id && styles.filterPillSelected,
                ]}
                onPress={() =>
                  setSelectedChildId(
                    selectedChildId === child.id ? undefined : child.id
                  )
                }
                testID={`button-child-${child.id}`}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedChildId === child.id && styles.filterPillTextSelected,
                  ]}
                >
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          <Text style={styles.sectionCount}>{documents.length}</Text>
        </View>

        {/* Document Cards */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to scan your first document
            </Text>
          </View>
        ) : (
          <View style={styles.documentsContainer}>
            {documents.map((doc, index) => renderDocument(doc, index))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Stripe style */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onNavigateToUpload}
        testID="button-upload"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Contextual Menu */}
      <ContextualMenu
        visible={menuVisible}
        anchorPosition={menuPosition}
        actions={[
          {
            label: 'Manage Children',
            onPress: onNavigateToChildren,
          },
          {
            label: 'Settings',
            onPress: () => Alert.alert('Settings', 'Coming soon'),
          },
          {
            label: 'Sign Out',
            onPress: handleLogout,
            destructive: true,
          },
        ]}
        onClose={() => setMenuVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  filterScrollView: {
    marginTop: 16,
    maxHeight: 50,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillSelected: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterPillTextSelected: {
    color: theme.colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  documentsContainer: {
    paddingBottom: 100,
  },
  documentCard: {
    gap: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  documentType: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  metaDivider: {
    fontSize: 13,
    color: theme.colors.textQuaternary,
  },
  dueDate: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statusprocessing: {
    backgroundColor: theme.colors.infoLight,
  },
  statusprocessed: {
    backgroundColor: theme.colors.successLight,
  },
  statusfailed: {
    backgroundColor: theme.colors.errorLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.large,
  },
  fabIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
  },
});