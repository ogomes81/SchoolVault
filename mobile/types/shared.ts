// Shared types imported from the web app
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  createdAt: string;
}

export interface Child {
  id: string;
  userId: string;
  name: string;
  grade: string;
  birthYear?: number;
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  childId?: string;
  title: string;
  docType: string;
  storagePath: string;
  pages: string[];
  ocrText?: string;
  status: 'processing' | 'processed' | 'failed';
  tags: string[];
  dueDate?: string;
  eventDate?: string;
  teacher?: string;
  subject?: string;
  isShared: boolean;
  shareToken?: string;
  createdAt: string;
}

export interface InsertDocument {
  userId: string;
  childId?: string;
  title: string;
  docType?: string;
  storagePath: string;
  pages?: string[];
  ocrText?: string;
  status?: string;
  tags?: string[];
  dueDate?: string;
  eventDate?: string;
  teacher?: string;
  subject?: string;
  isShared?: boolean;
  shareToken?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}