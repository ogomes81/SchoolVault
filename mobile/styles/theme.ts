// iOS Design System Colors and Spacing
export const theme = {
  colors: {
    // Primary colors (iOS Blue)
    primary: '#007AFF',
    primaryLight: '#4DA2FF',
    primaryDark: '#0056CC',
    
    // System colors
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',
    
    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C43',
    quaternaryLabel: '#3C3C43',
    
    // Fills
    systemFill: '#78788033',
    secondarySystemFill: '#78788028',
    tertiarySystemFill: '#7676801F',
    quaternarySystemFill: '#74748018',
    
    // Separators
    separator: '#3C3C434A',
    opaqueSeparator: '#C6C6C8',
    
    // Status colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    
    // Custom app colors
    documentBlue: '#2563EB',
    cameraGreen: '#10B981',
    uploadOrange: '#F59E0B',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
  },
  
  typography: {
    // iOS Typography Scale
    largeTitle: {
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 41,
    },
    title1: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
    },
    title2: {
      fontSize: 22,
      fontWeight: '700' as const,
      lineHeight: 28,
    },
    title3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 25,
    },
    headline: {
      fontSize: 17,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    callout: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 21,
    },
    subhead: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    footnote: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
    caption1: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    caption2: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 13,
    },
  },
  
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  animation: {
    timing: {
      quick: 200,
      normal: 300,
      slow: 500,
    },
    easing: {
      standard: 'ease-in-out',
      decelerate: 'ease-out',
      accelerate: 'ease-in',
    },
  },
};