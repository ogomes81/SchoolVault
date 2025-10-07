import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
}

const CURRENT_USER_KEY = 'currentUser';
const USERS_KEY = 'users';

// Generate a proper UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const getAuthHeaders = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('No authenticated session');
  }
  
  return {
    'x-user-id': user.id,
  };
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const stored = await SecureStore.getItemAsync(CURRENT_USER_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      // Check if user ID is valid UUID format
      if (user.id && user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        return user;
      }
    }
  } catch (e) {
    console.error('Error getting current user:', e);
  }
  return null;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  // Check if user already exists
  const usersStr = await SecureStore.getItemAsync(USERS_KEY);
  const existingUsers: User[] = usersStr ? JSON.parse(usersStr) : [];
  let user = existingUsers.find((u: User) => u.email === email);
  
  if (!user) {
    // Create new user with proper UUID
    user = {
      id: generateUUID(),
      email: email
    };
    existingUsers.push(user);
    await SecureStore.setItemAsync(USERS_KEY, JSON.stringify(existingUsers));
  }
  
  // Ensure user exists in database
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
  try {
    await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, email: user.email })
    });
  } catch (error) {
    console.error('Failed to sync user with database:', error);
    // Continue anyway - local auth still works
  }
  
  await SecureStore.setItemAsync(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
};

export const signUp = async (email: string, password: string): Promise<User> => {
  // Simple registration - same as sign in
  return signIn(email, password);
};

export const signOut = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(CURRENT_USER_KEY);
};

export const initAuth = async (): Promise<User | null> => {
  return getCurrentUser();
};
