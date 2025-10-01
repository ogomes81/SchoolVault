import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { apiClient } from '../lib/api';
import DocumentSharing from '../components/DocumentSharing';
import StripeLoadingScreen from '../components/StripeLoadingScreen';
import ContextualMenu from '../components/ContextualMenu';
import { theme } from '../styles/theme';
import type { Document } from '../types/shared';

interface DocumentDetailScreenProps {
  documentId: string;
  onGoBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function DocumentDetailScreen({
  documentId,
  onGoBack,
}: DocumentDetailScreenProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSharing, setShowSharing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const result = await apiClient.getDocument(documentId);
      if (result.data) {
        setDocument(result.data);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!document) return;
    setShowSharing(true);
  };

  const handleDeleteDocument = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteDocument,
        },
      ]
    );
  };

  const deleteDocument = async () => {
    if (!document) return;

    try {
      const result = await apiClient.deleteDocument(document.id);
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        Alert.alert('Success', 'Document deleted successfully', [
          { text: 'OK', onPress: onGoBack },
        ]);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      Alert.alert('Error', 'Failed to delete document');
    }
  };

  if (loading) {
    return <StripeLoadingScreen />;
  }

  if (!document) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Document not found</Text>
          <Text style={styles.errorText}>
            This document may have been deleted or you don't have access to it.
          </Text>
        </View>
      </View>
    );
  }

  const images = document.storagePath ? [document.storagePath] : [];

  return (
    <View style={styles.container}>
      {/* Stripe-style header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="button-back"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
          testID="button-menu"
        >
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Image Viewer */}
        {images.length > 0 && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: images[currentImageIndex] }}
              style={styles.image}
              resizeMode="contain"
            />
            {images.length > 1 && (
              <View style={styles.imagePagination}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Document Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{document.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{document.docType}</Text>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.metaText}>
                  {new Date(document.uploadedAt || '').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, styles[`status${document.status}`]]}>
              <Text style={styles.statusText}>{document.status}</Text>
            </View>
          </View>

          {/* Metadata */}
          {(document.dueDate || document.eventDate || document.teacher || document.subject) && (
            <View style={styles.metadataSection}>
              {document.dueDate && (
                <MetadataItem
                  label="Due Date"
                  value={new Date(document.dueDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                />
              )}
              {document.eventDate && (
                <MetadataItem
                  label="Event Date"
                  value={new Date(document.eventDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                />
              )}
              {document.teacher && (
                <MetadataItem label="Teacher" value={document.teacher} />
              )}
              {document.subject && (
                <MetadataItem label="Subject" value={document.subject} />
              )}
            </View>
          )}

          {/* Tags */}
          {document.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagsContainer}>
                {document.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* OCR Text Card */}
        {document.ocrText && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Extracted Text</Text>
            <Text style={styles.ocrText}>{document.ocrText}</Text>
          </View>
        )}

        {/* Actions Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            testID="button-share"
          >
            <Text style={styles.actionButtonIcon}>🔗</Text>
            <Text style={styles.actionButtonText}>Share Document</Text>
            <Text style={styles.actionButtonChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Contextual Menu */}
      <ContextualMenu
        visible={menuVisible}
        anchorPosition={{ x: 0, y: 100 }}
        actions={[
          {
            label: 'Share',
            onPress: handleShare,
          },
          {
            label: 'Delete',
            onPress: handleDeleteDocument,
            destructive: true,
          },
        ]}
        onClose={() => setMenuVisible(false)}
      />

      {/* Sharing Modal */}
      {showSharing && (
        <DocumentSharing
          document={document}
          onClose={() => setShowSharing(false)}
        />
      )}
    </View>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metadataItem}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue}>{value}</Text>
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
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 17,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 300,
    backgroundColor: theme.colors.backgroundSecondary,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: 'white',
    width: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  metaDivider: {
    fontSize: 14,
    color: theme.colors.textQuaternary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  metadataSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 15,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  tagsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  tagText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  ocrText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  actionButtonChevron: {
    fontSize: 20,
    color: theme.colors.textTertiary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});