import { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import type { Child } from '@shared/schema';

interface ChildContextType {
  children: Child[];
  selectedChild: string;
  setSelectedChild: (childId: string) => void;
  isLoading: boolean;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

export function ChildProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthGuard();
  const [selectedChild, setSelectedChild] = useState('');

  // Fetch children data
  const { data: childrenData = [], isLoading } = useQuery<Child[]>({
    queryKey: ['/api/children'],
    enabled: !!user,
  });

  const value = {
    children: childrenData,
    selectedChild,
    setSelectedChild,
    isLoading,
  };

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useChild() {
  const context = useContext(ChildContext);
  if (context === undefined) {
    throw new Error('useChild must be used within a ChildProvider');
  }
  return context;
}