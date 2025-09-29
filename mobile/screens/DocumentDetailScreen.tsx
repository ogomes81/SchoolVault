import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { apiClient } from '../lib/api';
import DocumentSharing from '../components/DocumentSharing';
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

  const enableSharing = async () => {
    if (!document) return;

    try {
      const result = await apiClient.updateDocument(document.id, {
        isShared: true,
      });

      if (result.data) {
        setDocument(result.data);
        Alert.alert('Success', 'Document sharing has been enabled!');
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error enabling sharing:', error);
      Alert.alert('Error', 'Failed to enable sharing');
    }
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
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading document...</Text>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Document not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = document.pages.length > 0 ? document.pages : [document.storagePath];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} testID="button-back">
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} testID="button-share">
            <Text style={styles.actionButton}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteDocument} testID="button-delete">
            <Text style={[styles.actionButton, styles.deleteButton]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Document Images */}
        <View style={styles.imageContainer}>
          {images.map((imagePath, index) => (
            <Image
              key={index}
              source={{ uri: imagePath }}
              style={styles.documentImage}
              resizeMode="contain"
            />
          ))}
          {images.length > 1 && (
            <Text style={styles.pageCount}>
              {images.length} page{images.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Document Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{document.title}</Text>
          
          <View style={styles.metadataRow}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>{document.docType}</Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.label}>Status:</Text>
            <View style={[styles.statusBadge, styles[`status${document.status}`]]}>
              <Text style={styles.statusText}>{document.status}</Text>
            </View>
          </View>

          {document.dueDate && (
            <View style={styles.metadataRow}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={styles.value}>
                {new Date(document.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          {document.eventDate && (
            <View style={styles.metadataRow}>
              <Text style={styles.label}>Event Date:</Text>
              <Text style={styles.value}>
                {new Date(document.eventDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          {document.teacher && (
            <View style={styles.metadataRow}>
              <Text style={styles.label}>Teacher:</Text>
              <Text style={styles.value}>{document.teacher}</Text>
            </View>
          )}

          {document.subject && (
            <View style={styles.metadataRow}>
              <Text style={styles.label}>Subject:</Text>
              <Text style={styles.value}>{document.subject}</Text>
            </View>
          )}

          {document.tags.length > 0 && (
            <View style={styles.metadataSection}>
              <Text style={styles.label}>Tags:</Text>
              <View style={styles.tagsContainer}>
                {document.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {document.ocrText && (
            <View style={styles.metadataSection}>
              <Text style={styles.label}>Extracted Text:</Text>
              <View style={styles.ocrTextContainer}>
                <Text style={styles.ocrText}>{document.ocrText}</Text>
              </View>
            </View>
          )}

          <View style={styles.metadataRow}>
            <Text style={styles.label}>Created:</Text>
            <Text style={styles.value}>
              {new Date(document.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.label}>Sharing:</Text>
            <Text style={styles.value}>
              {document.isShared ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
      </View>

      {/* Document Sharing Modal */}
      <DocumentSharing
        documentId={document.id}
        documentTitle={document.title}
        visible={showSharing}
        onClose={() => setShowSharing(false)}
      />
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 20,
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
  headerActions: {
    flexDirection: 'row',
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 16,
  },
  actionButton: {
    color: '#2563eb',
    fontSize: 16,
    marginLeft: 16,
  },
  deleteButton: {
    color: '#ef4444',
  },
  content: {
    padding: 20,
  },
  imageContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  documentImage: {
    width: screenWidth - 72,
    height: (screenWidth - 72) * 1.3, // Approximate document aspect ratio
    marginBottom: 16,
    borderRadius: 8,
  },
  pageCount: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metadataSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  value: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    textAlign: 'right',
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
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
  ocrTextContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  ocrText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
});