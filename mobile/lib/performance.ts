// Performance optimization utilities for React Native app
import { InteractionManager } from 'react-native';

/**
 * Execute heavy operations after animations complete
 * Ensures smooth UI interactions
 */
export const runAfterInteractions = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(callback);
};

/**
 * Debounce function to limit API calls
 * Useful for search inputs and frequent updates
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit function execution frequency
 * Good for scroll events and rapid user interactions
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memory cleanup for large lists
 * Removes items from memory when not visible
 */
export const getItemLayout = (data: any[], index: number, itemHeight: number) => ({
  length: itemHeight,
  offset: itemHeight * index,
  index,
});

/**
 * Optimize image loading for better performance
 */
export const optimizeImageUri = (uri: string, width?: number, height?: number): string => {
  // Add optimization parameters for better performance
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', '85'); // 85% quality for good balance

  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}${params.toString()}`;
};