import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  TextInput,
} from 'react-native';
import { sharingManager } from '../lib/sharing';

interface DocumentSharingProps {
  documentId: string;
  documentTitle: string;
  visible: boolean;
  onClose: () => void;
}

export default function DocumentSharing({
  documentId,
  documentTitle,
  visible,
  onClose,
}: DocumentSharingProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [expiresIn, setExpiresIn] = useState('24');
  const [sharing, setSharing] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');

  const handleGenerateLink = async () => {
    setSharing(true);
    
    try {
      const shareLink = await sharingManager.generateShareLink({
        documentId,
        documentTitle,
        isPublic,
        expiresIn: parseInt(expiresIn, 10) || 24,
      });

      if (shareLink) {
        setGeneratedLink(shareLink.url);
        Alert.alert(
          'Link Generated',
          'Share link has been generated successfully!',
          [
            {
              text: 'Copy Link',
              onPress: () => copyToClipboard(shareLink.url),
            },
            {
              text: 'Share Now',
              onPress: () => shareDocument(),
            },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to generate share link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate share link');
    } finally {
      setSharing(false);
    }
  };

  const shareDocument = async () => {
    setSharing(true);
    
    try {
      await sharingManager.shareDocument({
        documentId,
        documentTitle,
        isPublic,
        expiresIn: parseInt(expiresIn, 10) || 24,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share document');
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await sharingManager.copyToClipboard(url, documentTitle);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const resetForm = () => {
    setIsPublic(false);
    setExpiresIn('24');
    setGeneratedLink('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const expirationOptions = [
    { label: '1 hour', value: '1' },
    { label: '6 hours', value: '6' },
    { label: '24 hours', value: '24' },
    { label: '7 days', value: '168' },
    { label: '30 days', value: '720' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} testID="button-close-sharing">
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Document</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle} numberOfLines={2}>
              {documentTitle}
            </Text>
            <Text style={styles.documentSubtitle}>
              Generate a shareable link for this document
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <View style={styles.option}>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Public Access</Text>
                <Text style={styles.optionDescription}>
                  Anyone with the link can view this document
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                testID="switch-public-access"
              />
            </View>

            <View style={styles.option}>
              <Text style={styles.optionTitle}>Link Expires In</Text>
              <View style={styles.expirationButtons}>
                {expirationOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.expirationButton,
                      expiresIn === option.value && styles.expirationButtonSelected,
                    ]}
                    onPress={() => setExpiresIn(option.value)}
                    testID={`button-expiry-${option.value}`}
                  >
                    <Text
                      style={[
                        styles.expirationButtonText,
                        expiresIn === option.value && styles.expirationButtonTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.option}>
              <Text style={styles.optionTitle}>Custom Expiration (hours)</Text>
              <TextInput
                style={styles.customExpiryInput}
                value={expiresIn}
                onChangeText={setExpiresIn}
                placeholder="24"
                keyboardType="numeric"
                testID="input-custom-expiry"
              />
            </View>
          </View>

          {generatedLink && (
            <View style={styles.generatedLinkContainer}>
              <Text style={styles.generatedLinkTitle}>Generated Link:</Text>
              <TouchableOpacity
                style={styles.linkContainer}
                onPress={() => copyToClipboard(generatedLink)}
                testID="button-copy-generated-link"
              >
                <Text style={styles.linkText} numberOfLines={3}>
                  {generatedLink}
                </Text>
                <Text style={styles.copyHint}>Tap to copy</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateLink}
              disabled={sharing}
              testID="button-generate-link"
            >
              <Text style={styles.generateButtonText}>
                {sharing ? 'Generating...' : 'Generate Link'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareDocument}
              disabled={sharing}
              testID="button-share-document"
            >
              <Text style={styles.shareButtonText}>
                {sharing ? 'Sharing...' : 'Share Now'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              {isPublic
                ? '⚠️ Public links can be accessed by anyone who has the URL'
                : '🔒 Private links require recipient to sign in to view'}
            </Text>
          </View>
        </View>
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
  cancelButton: {
    color: '#6b7280',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  documentInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  documentSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  option: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  expirationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  expirationButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  expirationButtonSelected: {
    backgroundColor: '#2563eb',
  },
  expirationButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  expirationButtonTextSelected: {
    color: 'white',
  },
  customExpiryInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginTop: 8,
  },
  generatedLinkContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  generatedLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  linkContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  linkText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  copyHint: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  generateButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  generateButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },
});