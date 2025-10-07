import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/api';
import { signOut } from '../lib/auth';
import TapRipple from '../components/TapRipple';
import { theme } from '../styles/theme';
import type { Document, Child } from '../types/shared';

interface DashboardScreenProps {
  onLogout: () => void;
  onNavigateToUpload: () => void;
  onNavigateToDocument: (documentId: string) => void;
  onNavigateToChildren: () => void;
}

type StatFilter = 'total' | 'dueSoon' | 'thisMonth' | 'shared' | null;

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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>(null);
  const [showFilters, setShowFilters] = useState(false);

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
        // Auto-select first child
        if (!selectedChildId && childrenResult.data.length > 0) {
          setSelectedChildId(childrenResult.data[0].id);
        }
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

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      totalDocs: documents.length,
      dueSoon: documents.filter(doc => 
        doc.dueDate && 
        new Date(doc.dueDate) >= now && 
        new Date(doc.dueDate) <= oneWeekFromNow
      ).length,
      thisMonth: documents.filter(doc => 
        new Date(doc.createdAt) >= startOfMonth
      ).length,
      shared: documents.filter(doc => doc.isShared).length,
    };
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Child filter
      if (selectedChildId && doc.childId !== selectedChildId) {
        return false;
      }
      
      // Stat card filter
      if (activeStatFilter) {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        switch (activeStatFilter) {
          case 'total':
            break;
          case 'dueSoon':
            if (!doc.dueDate || 
                new Date(doc.dueDate) < now || 
                new Date(doc.dueDate) > oneWeekFromNow) {
              return false;
            }
            break;
          case 'thisMonth':
            if (new Date(doc.createdAt) < startOfMonth) {
              return false;
            }
            break;
          case 'shared':
            if (!doc.isShared) {
              return false;
            }
            break;
        }
      }
      
      // Doc type filter
      if (docTypeFilter !== 'all' && doc.docType !== docTypeFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchText = [
          doc.title,
          doc.ocrText,
          ...(Array.isArray(doc.tags) ? doc.tags : []),
          doc.teacher,
          doc.subject,
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchText.includes(query);
      }
      
      return true;
    });
  }, [documents, selectedChildId, docTypeFilter, searchQuery, activeStatFilter]);

  const handleStatCardPress = (filterType: StatFilter) => {
    if (activeStatFilter === filterType) {
      setActiveStatFilter(null);
      setSearchQuery('');
      setDocTypeFilter('all');
    } else {
      setActiveStatFilter(filterType);
      setSearchQuery('');
      setDocTypeFilter('all');
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SchoolVault</Text>
          {selectedChild && (
            <Text style={styles.headerSubtitle}>{selectedChild.name}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onNavigateToChildren}
            style={styles.iconButton}
            testID="button-manage-children"
          >
            <Ionicons name="people-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.iconButton}
            testID="button-logout"
          >
            <Ionicons name="log-out-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Child Pills */}
        {children.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.childPillsContainer}
            contentContainerStyle={styles.childPillsContent}
          >
            <TouchableOpacity
              style={[
                styles.childPill,
                !selectedChildId && styles.childPillActive,
              ]}
              onPress={() => setSelectedChildId(undefined)}
              testID="button-child-all"
            >
              <Text
                style={[
                  styles.childPillText,
                  !selectedChildId && styles.childPillTextActive,
                ]}
              >
                All Children
              </Text>
            </TouchableOpacity>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.childPill,
                  selectedChildId === child.id && styles.childPillActive,
                ]}
                onPress={() => setSelectedChildId(child.id)}
                testID={`button-child-${child.id}`}
              >
                <Text
                  style={[
                    styles.childPillText,
                    selectedChildId === child.id && styles.childPillTextActive,
                  ]}
                >
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[
              styles.statCard,
              styles.statCardBlue,
              activeStatFilter === 'total' && styles.statCardActive,
            ]}
            onPress={() => handleStatCardPress('total')}
            testID="stat-card-total"
          >
            <View style={styles.statCardContent}>
              <Text style={styles.statCardLabel}>Total Documents</Text>
              <Text style={styles.statCardValue}>{stats.totalDocs}</Text>
            </View>
            <View style={styles.statCardIcon}>
              <Ionicons name="document-text" size={24} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              styles.statCardOrange,
              activeStatFilter === 'dueSoon' && styles.statCardActive,
            ]}
            onPress={() => handleStatCardPress('dueSoon')}
            testID="stat-card-due-soon"
          >
            <View style={styles.statCardContent}>
              <Text style={styles.statCardLabel}>Due This Week</Text>
              <Text style={styles.statCardValue}>{stats.dueSoon}</Text>
            </View>
            <View style={styles.statCardIcon}>
              <Ionicons name="time" size={24} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              styles.statCardGreen,
              activeStatFilter === 'thisMonth' && styles.statCardActive,
            ]}
            onPress={() => handleStatCardPress('thisMonth')}
            testID="stat-card-this-month"
          >
            <View style={styles.statCardContent}>
              <Text style={styles.statCardLabel}>This Month</Text>
              <Text style={styles.statCardValue}>{stats.thisMonth}</Text>
            </View>
            <View style={styles.statCardIcon}>
              <Ionicons name="calendar" size={24} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              styles.statCardPurple,
              activeStatFilter === 'shared' && styles.statCardActive,
            ]}
            onPress={() => handleStatCardPress('shared')}
            testID="stat-card-shared"
          >
            <View style={styles.statCardContent}>
              <Text style={styles.statCardLabel}>Shared</Text>
              <Text style={styles.statCardValue}>{stats.shared}</Text>
            </View>
            <View style={styles.statCardIcon}>
              <Ionicons name="share-social" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
            testID="button-toggle-filters"
          >
            <Ionicons name="filter" size={20} color="#4b5563" />
            <Text style={styles.filterToggleText}>Filters</Text>
            <Ionicons 
              name={showFilters ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#4b5563" 
            />
          </TouchableOpacity>

          {showFilters && (
            <View style={styles.filterControls}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  testID="input-search"
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.docTypeFilters}
              >
                {['all', 'Homework', 'Permission Slip', 'Flyer', 'Report Card', 'Other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.docTypeChip,
                      docTypeFilter === type && styles.docTypeChipActive,
                    ]}
                    onPress={() => setDocTypeFilter(type)}
                    testID={`filter-type-${type}`}
                  >
                    <Text
                      style={[
                        styles.docTypeChipText,
                        docTypeFilter === type && styles.docTypeChipTextActive,
                      ]}
                    >
                      {type === 'all' ? 'All Types' : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Documents List */}
        <View style={styles.documentsContainer}>
          <Text style={styles.documentsHeader}>
            {searchQuery ? `Search Results (${filteredDocuments.length})` : 'Recent Documents'}
          </Text>

          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : filteredDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No documents found' : 'No documents yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery 
                  ? 'Try adjusting your filters' 
                  : 'Upload your first document to get started'}
              </Text>
            </View>
          ) : (
            filteredDocuments.map((doc) => (
              <TapRipple
                key={doc.id}
                onPress={() => onNavigateToDocument(doc.id)}
                testID={`card-document-${doc.id}`}
              >
                <View style={styles.documentCard}>
                  {/* Document Header */}
                  <View style={styles.documentHeader}>
                    <View style={styles.documentBadges}>
                      <View style={[styles.badge, getDocTypeBadgeStyle(doc.docType)]}>
                        <Text style={styles.badgeText}>{doc.docType}</Text>
                      </View>
                      {doc.status === 'processing' && (
                        <View style={[styles.badge, styles.badgeProcessing]}>
                          <Text style={styles.badgeText}>Processing...</Text>
                        </View>
                      )}
                      {doc.dueDate && (
                        <View style={[styles.badge, getDueDateBadgeStyle(doc.dueDate)]}>
                          <Text style={styles.badgeText}>
                            Due {new Date(doc.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        </View>
                      )}
                      {doc.isShared && (
                        <View style={[styles.badge, styles.badgeShared]}>
                          <Ionicons name="share-social" size={12} color="white" />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Document Title */}
                  <Text style={styles.documentTitle} numberOfLines={2}>
                    {doc.title}
                  </Text>

                  {/* Document Metadata */}
                  <View style={styles.documentMeta}>
                    {doc.subject && (
                      <Text style={styles.metaText}>
                        <Ionicons name="book-outline" size={14} color="#6b7280" />
                        {' '}{doc.subject}
                      </Text>
                    )}
                    {doc.teacher && (
                      <Text style={styles.metaText}>
                        <Ionicons name="person-outline" size={14} color="#6b7280" />
                        {' '}{doc.teacher}
                      </Text>
                    )}
                  </View>

                  {/* Document Tags */}
                  {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {doc.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                      {doc.tags.length > 3 && (
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>+{doc.tags.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Document Footer */}
                  <View style={styles.documentFooter}>
                    <Text style={styles.dateText}>
                      <Ionicons name="time-outline" size={14} color="#9ca3af" />
                      {' '}{new Date(doc.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              </TapRipple>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onNavigateToUpload}
        testID="button-upload"
      >
        <Ionicons name="camera" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const getDocTypeBadgeStyle = (docType: string) => {
  switch (docType) {
    case 'Homework':
      return { backgroundColor: '#10b981' };
    case 'Permission Slip':
      return { backgroundColor: '#3b82f6' };
    case 'Flyer':
      return { backgroundColor: '#f59e0b' };
    case 'Report Card':
      return { backgroundColor: '#a855f7' };
    default:
      return { backgroundColor: '#6b7280' };
  }
};

const getDueDateBadgeStyle = (dueDate: string) => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { backgroundColor: '#ef4444' };
  if (diffDays <= 1) return { backgroundColor: '#f59e0b' };
  if (diffDays <= 7) return { backgroundColor: '#f97316' };
  return { backgroundColor: '#10b981' };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  childPillsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  childPillsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  childPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  childPillActive: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF',
  },
  childPillText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  childPillTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardActive: {
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  statCardBlue: {
    backgroundColor: '#3b82f6',
  },
  statCardOrange: {
    backgroundColor: '#f97316',
  },
  statCardGreen: {
    backgroundColor: '#10b981',
  },
  statCardPurple: {
    backgroundColor: '#a855f7',
  },
  statCardContent: {
    flex: 1,
  },
  statCardLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  statCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  filterToggleText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  filterControls: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  docTypeFilters: {
    flexDirection: 'row',
  },
  docTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  docTypeChipActive: {
    backgroundColor: '#635BFF',
  },
  docTypeChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  docTypeChipTextActive: {
    color: 'white',
  },
  documentsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  documentsHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  documentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  documentHeader: {
    marginBottom: 12,
  },
  documentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeProcessing: {
    backgroundColor: '#f59e0b',
  },
  badgeShared: {
    backgroundColor: '#6b7280',
  },
  badgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  documentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagText: {
    fontSize: 12,
    color: '#6b7280',
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#635BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
