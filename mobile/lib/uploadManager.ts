import { apiClient } from './api';
import { ENV } from '../config/env';

export interface UploadProgress {
  id: string;
  title: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class UploadManager {
  private uploads: Map<string, UploadProgress> = new Map();
  private listeners: ((uploads: UploadProgress[]) => void)[] = [];

  // Generate unique upload ID
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add listener for upload progress updates
  addListener(listener: (uploads: UploadProgress[]) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of upload changes
  private notifyListeners() {
    const uploads = Array.from(this.uploads.values());
    this.listeners.forEach(listener => listener(uploads));
  }

  // Update upload progress
  private updateUpload(id: string, update: Partial<UploadProgress>) {
    const existing = this.uploads.get(id);
    if (existing) {
      this.uploads.set(id, { ...existing, ...update });
      this.notifyListeners();
    }
  }

  // Start document upload with progress tracking
  async uploadDocument(
    title: string,
    images: string[],
    docType: string = 'Other',
    childId?: string
  ): Promise<string> {
    const uploadId = this.generateUploadId();
    
    // Initialize upload progress
    const uploadProgress: UploadProgress = {
      id: uploadId,
      title,
      progress: 0,
      status: 'uploading',
    };
    
    this.uploads.set(uploadId, uploadProgress);
    this.notifyListeners();

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('docType', docType);
      
      if (childId) {
        formData.append('childId', childId);
      }

      // Add images to form data
      images.forEach((imageUri, index) => {
        formData.append('files', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `page_${index + 1}.jpg`,
        } as any);
      });

      // Update progress to show upload starting
      this.updateUpload(uploadId, { progress: 10 });

      // Upload document
      const result = await apiClient.createDocument(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      // Upload completed successfully
      this.updateUpload(uploadId, { 
        progress: 60, 
        status: 'processing' 
      });

      // Start polling for processing completion
      if (result.data) {
        this.pollDocumentProcessing(uploadId, result.data.id);
      }

      return uploadId;

    } catch (error: any) {
      console.error('Upload error:', error);
      this.updateUpload(uploadId, {
        progress: 0,
        status: 'failed',
        error: error.message || 'Upload failed',
      });
      throw error;
    }
  }

  // Poll document processing status
  private async pollDocumentProcessing(uploadId: string, documentId: string) {
    const maxAttempts = 30; // 30 attempts = ~2.5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        
        const result = await apiClient.getDocument(documentId);
        
        if (result.data) {
          const document = result.data;
          
          // Update progress based on status
          if (document.status === 'processed') {
            this.updateUpload(uploadId, {
              progress: 100,
              status: 'completed',
            });
            
            // Remove completed upload after 5 seconds
            setTimeout(() => {
              this.uploads.delete(uploadId);
              this.notifyListeners();
            }, 5000);
            
            return;
          } else if (document.status === 'failed') {
            this.updateUpload(uploadId, {
              progress: 60,
              status: 'failed',
              error: 'Document processing failed',
            });
            return;
          }
          
          // Still processing - update progress
          const progress = Math.min(60 + (attempts * 2), 95);
          this.updateUpload(uploadId, { progress });
        }

        // Continue polling if not done and under max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          // Timeout
          this.updateUpload(uploadId, {
            progress: 90,
            status: 'failed',
            error: 'Processing timeout - please check document status later',
          });
        }

      } catch (error) {
        console.error('Polling error:', error);
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Retry
        } else {
          this.updateUpload(uploadId, {
            progress: 60,
            status: 'failed',
            error: 'Failed to check processing status',
          });
        }
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  }

  // Get current uploads
  getUploads(): UploadProgress[] {
    return Array.from(this.uploads.values());
  }

  // Remove failed upload
  removeUpload(id: string) {
    this.uploads.delete(id);
    this.notifyListeners();
  }

  // Clear all completed uploads
  clearCompleted() {
    const completed = Array.from(this.uploads.entries())
      .filter(([_, upload]) => upload.status === 'completed')
      .map(([id]) => id);
    
    completed.forEach(id => this.uploads.delete(id));
    this.notifyListeners();
  }
}

export const uploadManager = new UploadManager();