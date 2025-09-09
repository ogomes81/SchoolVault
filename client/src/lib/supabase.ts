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

export const uploadDocument = async (file: File, userId: string, documentId: string): Promise<string> => {
  // Convert file to base64 for storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const filePath = `documents/${userId}/${documentId}`;
      localStorage.setItem(filePath, base64);
      resolve(filePath);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getDocumentUrl = (storagePath: string): string => {
  const base64 = localStorage.getItem(storagePath);
  return base64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODAgMTUwTDIyMCAxMTBMMjYwIDE1MEwyMjAgMTkwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
};
