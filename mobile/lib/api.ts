import { supabase } from './supabase';
import type { Document, Child, Profile, ApiResponse } from '../types/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers,
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return { data };
    } catch (error: any) {
      console.error('API Error:', error);
      return { error: error.message };
    }
  }

  // Documents
  async getDocuments(childId?: string): Promise<ApiResponse<Document[]>> {
    const params = childId ? `?childId=${childId}` : '';
    return this.request<Document[]>(`/api/documents${params}`);
  }

  async getDocument(id: string): Promise<ApiResponse<Document>> {
    return this.request<Document>(`/api/documents/${id}`);
  }

  async createDocument(document: FormData): Promise<ApiResponse<Document>> {
    const headers = await this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set multipart boundary
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers,
        body: document,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<ApiResponse<Document>> {
    return this.request<Document>(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Children
  async getChildren(): Promise<ApiResponse<Child[]>> {
    return this.request<Child[]>('/api/children');
  }

  async createChild(child: Omit<Child, 'id' | 'userId' | 'createdAt'>): Promise<ApiResponse<Child>> {
    return this.request<Child>('/api/children', {
      method: 'POST',
      body: JSON.stringify(child),
    });
  }

  async updateChild(id: string, updates: Partial<Child>): Promise<ApiResponse<Child>> {
    return this.request<Child>(`/api/children/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteChild(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/children/${id}`, {
      method: 'DELETE',
    });
  }

  // Sharing
  async generateShareToken(
    documentId: string,
    options: { isPublic?: boolean; expiresIn?: number }
  ): Promise<ApiResponse<{ token: string; expiresAt?: string }>> {
    return this.request(`/api/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async validateShareToken(token: string): Promise<ApiResponse<{ documentId: string }>> {
    return this.request(`/api/shared/${token}/validate`);
  }

  async revokeShareToken(token: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/shared/${token}`, {
      method: 'DELETE',
    });
  }

  async getDocumentShareLinks(documentId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/documents/${documentId}/share`);
  }

  // Profile
  async getProfile(): Promise<ApiResponse<Profile>> {
    return this.request<Profile>('/api/profile');
  }

  async updateProfile(updates: Partial<Profile>): Promise<ApiResponse<Profile>> {
    return this.request<Profile>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

export const apiClient = new ApiClient();