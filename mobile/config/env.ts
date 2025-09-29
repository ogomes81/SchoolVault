// Environment configuration for the mobile app
export const ENV = {
  // API Configuration
  API_URL: __DEV__ 
    ? 'http://localhost:5000'  // Development - your local server
    : 'https://your-production-api.com', // Production - update this later
  
  // Supabase Configuration - these need to be set
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // App Configuration
  APP_NAME: 'SchoolVault',
  VERSION: '1.0.0',
  
  // Features flags for development
  ENABLE_LOGGING: __DEV__,
  ENABLE_DEV_TOOLS: __DEV__,
};

// Development helper
export const isDev = __DEV__;
export const isProd = !__DEV__;