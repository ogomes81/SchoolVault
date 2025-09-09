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

export const signIn = async (email: string, password: string): Promise<User> => {
  // Simple mock authentication - in real app this would verify against database
  const user = {
    id: 'user-' + Math.random().toString(36).substring(7),
    email: email
  };
  
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
    currentUser = JSON.parse(stored);
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
