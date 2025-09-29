import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { uploadManager, UploadProgress as UploadProgressType } from '../lib/uploadManager';

interface UploadProgressProps {
  visible: boolean;
  onClose: () => void;
}

export default function UploadProgress({ visible, onClose }: UploadProgressProps) {
  const [uploads, setUploads] = useState<UploadProgressType[]>([]);
  const progressAnims = new Map<string, Animated.Value>();

  useEffect(() => {
    const unsubscribe = uploadManager.addListener(setUploads);
    return unsubscribe;
  }, []);

  // Initialize progress animations for new uploads
  useEffect(() => {
    uploads.forEach(upload => {
      if (!progressAnims.has(upload.id)) {
        const animValue = new Animated.Value(0);
        progressAnims.set(upload.id, animValue);
        
        // Animate to current progress
        Animated.timing(animValue, {
          toValue: upload.progress,
          duration: 300,
          useNativeDriver: false,
        }).start();
      } else {
        // Update existing animation
        const animValue = progressAnims.get(upload.id)!;
        Animated.timing(animValue, {
          toValue: upload.progress,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    });
  }, [uploads]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
        return '#2563eb';
      case 'processing':
        return '#f59e0b';
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing OCR...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const handleRemoveUpload = (id: string) => {
    uploadManager.removeUpload(id);
  };

  const handleClearCompleted = () => {
    uploadManager.clearCompleted();
  };

  const hasCompletedUploads = uploads.some(upload => upload.status === 'completed');
  const hasActiveUploads = uploads.some(upload => 
    upload.status === 'uploading' || upload.status === 'processing'
  );

  if (!visible || uploads.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upload Progress</Text>
          <View style={styles.headerActions}>
            {hasCompletedUploads && (
              <TouchableOpacity 
                onPress={handleClearCompleted}
                style={styles.clearButton}
                testID="button-clear-completed"
              >
                <Text style={styles.clearButtonText}>Clear Completed</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              testID="button-close-progress"
            >
              <Text style={styles.closeButtonText}>
                {hasActiveUploads ? 'Minimize' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.uploadsList}>
          {uploads.map((upload) => {
            const progressAnim = progressAnims.get(upload.id);
            
            return (
              <View key={upload.id} style={styles.uploadItem}>
                <View style={styles.uploadHeader}>
                  <Text style={styles.uploadTitle} numberOfLines={1}>
                    {upload.title}
                  </Text>
                  {upload.status === 'failed' && (
                    <TouchableOpacity
                      onPress={() => handleRemoveUpload(upload.id)}
                      style={styles.removeButton}
                      testID={`button-remove-${upload.id}`}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    {progressAnim && (
                      <Animated.View
                        style={[
                          styles.progressBar,
                          {
                            backgroundColor: getStatusColor(upload.status),
                            width: progressAnim.interpolate({
                              inputRange: [0, 100],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    )}
                  </View>
                  
                  <View style={styles.progressInfo}>
                    <Text style={styles.statusText}>
                      {getStatusText(upload.status)}
                    </Text>
                    <Text style={styles.progressText}>
                      {Math.round(upload.progress)}%
                    </Text>
                  </View>
                </View>

                {upload.error && (
                  <Text style={styles.errorText}>{upload.error}</Text>
                )}
              </View>
            );
          })}
        </View>

        {hasActiveUploads && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Uploads will continue in the background
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: 16,
  },
  clearButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  closeButton: {
    
  },
  closeButtonText: {
    color: '#2563eb',
    fontSize: 16,
  },
  uploadsList: {
    flex: 1,
    padding: 20,
  },
  uploadItem: {
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
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});