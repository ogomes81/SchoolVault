import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No authenticated session');
  }
  
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw error;
  }
  
  return user;
};

export const uploadDocument = async (file: File, userId: string, documentId: string) => {
  const filePath = `documents/${userId}/${documentId}.jpg`;
  
  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });
    
  if (error) {
    throw error;
  }
  
  return filePath;
};

export const getDocumentUrl = (storagePath: string) => {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath);
    
  return data.publicUrl;
};
