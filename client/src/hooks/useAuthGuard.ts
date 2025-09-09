import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getCurrentUser, signOut as authSignOut, initAuth } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
}

export const useAuthGuard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = initAuth();
        setUser(currentUser);
        
        if (!currentUser) {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    navigate('/auth');
  };

  return { user, loading, signOut };
};
