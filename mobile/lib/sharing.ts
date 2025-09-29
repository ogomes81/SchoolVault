import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { Platform, Alert } from 'react-native';
import { apiClient } from './api';

export interface ShareOptions {
  documentId: string;
  documentTitle: string;
  isPublic?: boolean;
  expiresIn?: number; // Hours until expiration
}

export interface ShareLink {
  url: string;
  token: string;
  expiresAt?: Date;
}

class SharingManager {
  
  // Generate a shareable link for a document
  async generateShareLink(options: ShareOptions): Promise<ShareLink | null> {
    try {
      const { documentId, isPublic = false, expiresIn = 24 } = options;
      
      // Call backend to generate share token
      const result = await apiClient.generateShareToken(documentId, {
        isPublic,
        expiresIn,
      });

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to generate share link');
      }

      const { token, expiresAt } = result.data;
      
      // Create the deep link URL
      const baseUrl = this.getBaseUrl();
      const shareUrl = `${baseUrl}/shared/${token}`;

      return {
        url: shareUrl,
        token,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      };

    } catch (error) {
      console.error('Error generating share link:', error);
      return null;
    }
  }

  // Share document via native share sheet
  async shareDocument(options: ShareOptions): Promise<boolean> {
    try {
      const shareLink = await this.generateShareLink(options);
      
      if (!shareLink) {
        Alert.alert('Error', 'Failed to generate share link');
        return false;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        // Fallback to copying to clipboard
        return this.copyToClipboard(shareLink.url, options.documentTitle);
      }

      // Use native share sheet
      await Sharing.shareAsync(shareLink.url, {
        mimeType: 'text/plain',
        dialogTitle: `Share "${options.documentTitle}"`,
      });

      return true;

    } catch (error) {
      console.error('Error sharing document:', error);
      Alert.alert('Error', 'Failed to share document');
      return false;
    }
  }

  // Copy share link to clipboard
  async copyToClipboard(url: string, documentTitle: string): Promise<boolean> {
    try {
      // Import dynamically to avoid issues with Expo Clipboard
      const { default: Clipboard } = await import('expo-clipboard');
      
      await Clipboard.setStringAsync(url);
      
      Alert.alert(
        'Link Copied',
        `Share link for "${documentTitle}" has been copied to your clipboard.`,
        [{ text: 'OK' }]
      );

      return true;
      
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard');
      return false;
    }
  }

  // Generate QR code for sharing (optional enhancement)
  async generateQRCode(shareUrl: string): Promise<string | null> {
    try {
      // This would require a QR code generation library
      // For now, return the URL that could be converted to QR
      return shareUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }

  // Handle incoming deep links
  async handleDeepLink(url: string): Promise<{ documentId?: string; token?: string } | null> {
    try {
      const parsed = Linking.parse(url);
      
      // Check if it's a shared document link
      if (parsed.path?.includes('/shared/')) {
        const token = parsed.path.split('/shared/')[1];
        
        if (token) {
          // Validate token and get document info
          const result = await apiClient.validateShareToken(token);
          
          if (result.data?.documentId) {
            return {
              documentId: result.data.documentId,
              token,
            };
          }
        }
      }

      return null;
      
    } catch (error) {
      console.error('Error handling deep link:', error);
      return null;
    }
  }

  // Get appropriate base URL for the environment
  private getBaseUrl(): string {
    // In production, this should be your actual domain
    // For development, you might want to use ngrok or similar
    if (__DEV__) {
      return 'https://your-app.replit.app'; // Replace with your Replit app URL
    }
    return 'https://schoolvault.app'; // Replace with your production domain
  }

  // Revoke a share token
  async revokeShareLink(token: string): Promise<boolean> {
    try {
      const result = await apiClient.revokeShareToken(token);
      return !result.error;
    } catch (error) {
      console.error('Error revoking share link:', error);
      return false;
    }
  }

  // List all active share links for a document
  async getDocumentShareLinks(documentId: string): Promise<ShareLink[]> {
    try {
      const result = await apiClient.getDocumentShareLinks(documentId);
      
      if (result.data) {
        return result.data.map((link: any) => ({
          url: `${this.getBaseUrl()}/shared/${link.token}`,
          token: link.token,
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined,
        }));
      }

      return [];
      
    } catch (error) {
      console.error('Error getting share links:', error);
      return [];
    }
  }

  // Check if sharing is available on this platform
  async isSharingAvailable(): Promise<boolean> {
    try {
      return await Sharing.isAvailableAsync();
    } catch {
      return false;
    }
  }

  // Share multiple documents as a collection
  async shareDocumentCollection(
    documentIds: string[],
    collectionName: string
  ): Promise<boolean> {
    try {
      // This would require backend support for collections
      // For now, generate individual links
      const shareLinks: string[] = [];
      
      for (const documentId of documentIds) {
        const link = await this.generateShareLink({
          documentId,
          documentTitle: `Document ${documentId}`,
        });
        
        if (link) {
          shareLinks.push(link.url);
        }
      }

      if (shareLinks.length === 0) {
        Alert.alert('Error', 'Failed to generate any share links');
        return false;
      }

      const shareText = `${collectionName}\n\n${shareLinks.join('\n')}`;
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(shareText, {
          mimeType: 'text/plain',
          dialogTitle: `Share Collection: ${collectionName}`,
        });
      } else {
        await this.copyToClipboard(shareText, collectionName);
      }

      return true;
      
    } catch (error) {
      console.error('Error sharing collection:', error);
      Alert.alert('Error', 'Failed to share document collection');
      return false;
    }
  }
}

export const sharingManager = new SharingManager();