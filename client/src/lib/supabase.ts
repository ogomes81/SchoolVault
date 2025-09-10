// Simple local authentication and storage
interface User {
  id: string;
  email: string;
}

let currentUser: User | null = null;

export const getAuthHeaders = async () => {
  if (!currentUser) {
    throw new Error('No authenticated session');
  }
  
  return {
    'x-user-id': currentUser.id,
  };
};

export const getCurrentUser = async (): Promise<User | null> => {
  return currentUser;
};

// Generate a proper UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const signIn = async (email: string, password: string): Promise<User> => {
  // Check if user already exists in localStorage
  const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
  let user = existingUsers.find((u: User) => u.email === email);
  
  if (!user) {
    // Create new user with proper UUID
    user = {
      id: generateUUID(),
      email: email
    };
    existingUsers.push(user);
    localStorage.setItem('users', JSON.stringify(existingUsers));
  }
  
  // Ensure user exists in database
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, email: user.email })
    });
  } catch (error) {
    console.error('Failed to sync user with database:', error);
    // Continue anyway - local auth still works
  }
  
  currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(user));
  return user;
};

export const signUp = async (email: string, password: string): Promise<User> => {
  // Simple mock registration
  return signIn(email, password);
};

export const signOut = async (): Promise<void> => {
  currentUser = null;
  localStorage.removeItem('currentUser');
};

export const initAuth = (): User | null => {
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      // Check if user ID is valid UUID format
      if (user.id && user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        currentUser = user;
        
        // Clean up old localStorage data since we moved to Azure Storage
        cleanupOldStorageData();
      } else {
        // Clear invalid user data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('users');
        currentUser = null;
      }
    } catch (e) {
      localStorage.removeItem('currentUser');
      currentUser = null;
    }
  }
  return currentUser;
};

// Clean up old localStorage document data since we moved to Azure Storage
const cleanupOldStorageData = () => {
  try {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Remove any document file data (keys that start with 'documents/')
    keys.forEach(key => {
      if (key.startsWith('documents/')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Cleaned up old localStorage document data');
  } catch (error) {
    console.warn('Failed to cleanup old storage data:', error);
  }
};

export const uploadDocument = async (file: File, userId: string, documentId: string, customFileName?: string): Promise<string> => {
  // Upload to Azure Storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const fileName = `documents/${userId}/${customFileName || documentId}`;
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: base64,
            fileName: fileName,
            contentType: file.type
          })
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const result = await response.json();
        resolve(result.storagePath);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getDocumentUrl = (storagePath: string): string => {
  // For Azure Storage, we'll fetch the URL from the server
  // For now, return a placeholder that will be handled by the img onError
  return `/api/file/${encodeURIComponent(storagePath)}`;
};
