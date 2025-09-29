import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadManager } from '../lib/uploadManager';
import DocumentScanner from '../components/DocumentScanner';
import UploadProgress from '../components/UploadProgress';
import type { Child } from '../types/shared';

interface UploadScreenProps {
  onGoBack: () => void;
  children: Child[];
}

export default function UploadScreen({ onGoBack, children }: UploadScreenProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [docType, setDocType] = useState('Other');
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const docTypes = ['Homework', 'Permission Slip', 'Flyer', 'Report Card', 'Other'];

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map((asset) => asset.uri);
        setSelectedImages([...selectedImages, ...imageUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const openDocumentScanner = () => {
    setShowScanner(true);
  };

  const handleScannerImages = (images: string[]) => {
    setSelectedImages([...selectedImages, ...images]);
    setShowScanner(false);
    
    // Auto-generate title if none exists
    if (!title.trim() && images.length > 0) {
      const now = new Date();
      const defaultTitle = `Document ${now.toLocaleDateString()}`;
      setTitle(defaultTitle);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const uploadDocument = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the document');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    setUploading(true);

    try {
      // Start background upload
      await uploadManager.uploadDocument(
        title,
        selectedImages,
        docType,
        selectedChildId || undefined
      );

      // Show success message and reset form
      Alert.alert(
        'Upload Started',
        'Your document is being uploaded and processed. You can track progress in the uploads panel.',
        [
          {
            text: 'View Progress',
            onPress: () => setShowProgress(true),
          },
          {
            text: 'Upload Another',
            onPress: resetForm,
          },
          {
            text: 'Go Back',
            onPress: onGoBack,
          },
        ]
      );

    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedImages([]);
    setDocType('Other');
    setSelectedChildId('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} testID="button-back">
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Document</Text>
        <TouchableOpacity 
          onPress={() => setShowProgress(true)} 
          testID="button-view-progress"
        >
          <Text style={styles.progressButton}>📊 Progress</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Document Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter document title"
            testID="input-title"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Document Type</Text>
          <View style={styles.docTypeContainer}>
            {docTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.docTypeButton,
                  docType === type && styles.docTypeButtonSelected,
                ]}
                onPress={() => setDocType(type)}
                testID={`button-doctype-${type}`}
              >
                <Text
                  style={[
                    styles.docTypeText,
                    docType === type && styles.docTypeTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {children.length > 0 && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Assign to Child (Optional)</Text>
            <View style={styles.childrenContainer}>
              <TouchableOpacity
                style={[
                  styles.childButton,
                  !selectedChildId && styles.childButtonSelected,
                ]}
                onPress={() => setSelectedChildId('')}
                testID="button-child-none"
              >
                <Text
                  style={[
                    styles.childButtonText,
                    !selectedChildId && styles.childButtonTextSelected,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    styles.childButton,
                    selectedChildId === child.id && styles.childButtonSelected,
                  ]}
                  onPress={() => setSelectedChildId(child.id)}
                  testID={`button-assign-child-${child.id}`}
                >
                  <Text
                    style={[
                      styles.childButtonText,
                      selectedChildId === child.id && styles.childButtonTextSelected,
                    ]}
                  >
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Images</Text>
          <View style={styles.imageActions}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={openDocumentScanner}
              testID="button-scan-document"
            >
              <Text style={styles.primaryActionText}>📱 Scan Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={pickImages}
              testID="button-gallery"
            >
              <Text style={styles.secondaryActionText}>🖼️ Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          {selectedImages.length > 0 && (
            <View style={styles.imagesContainer}>
              <Text style={styles.imagesCount}>
                {selectedImages.length} image(s) selected
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedImages.map((uri, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                      testID={`button-remove-image-${index}`}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={uploadDocument}
          disabled={uploading}
          testID="button-upload-document"
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <DocumentScanner
          onImagesSelected={handleScannerImages}
          onClose={() => setShowScanner(false)}
        />
      </Modal>

      {/* Upload Progress Modal */}
      <UploadProgress
        visible={showProgress}
        onClose={() => setShowProgress(false)}
      />
    </ScrollView>
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
  backButton: {
    color: '#2563eb',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  progressButton: {
    color: '#2563eb',
    fontSize: 16,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  docTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  docTypeButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  docTypeButtonSelected: {
    backgroundColor: '#2563eb',
  },
  docTypeText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  docTypeTextSelected: {
    color: 'white',
  },
  childrenContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  childButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
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
  imageActions: {
    marginBottom: 16,
  },
  primaryActionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryActionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  imagesContainer: {
    marginTop: 16,
  },
  imagesCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});