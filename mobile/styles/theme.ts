// Stripe-Inspired Design System
export const theme = {
  colors: {
    // Stripe Primary Palette
    primary: '#635BFF',        // Stripe Purple
    primaryLight: '#7A73FF',
    primaryDark: '#4F46E5',
    
    // Neutral Grays (Stripe-style)
    background: '#FFFFFF',
    backgroundSecondary: '#FAFAFA',
    backgroundTertiary: '#F6F9FC',
    
    // Text Colors (Stripe hierarchy)
    textPrimary: '#0A2540',      // Deep navy
    textSecondary: '#425466',     // Medium gray
    textTertiary: '#8898AA',      // Light gray
    textQuaternary: '#A3ACB9',    // Very light gray
    
    // Surface Colors
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Border Colors
    border: '#E3E8EE',
    borderLight: '#F0F4F8',
    borderDark: '#D0D7DE',
    
    // Status Colors (Stripe-style)
    success: '#00D924',
    successLight: '#E6F9EC',
    warning: '#FFA900',
    warningLight: '#FFF8E6',
    error: '#DF1B41',
    errorLight: '#FFE8EC',
    info: '#0074D4',
    infoLight: '#E6F2FF',
    
    // Accent Colors
    accent: '#635BFF',
    accentLight: '#F6F5FF',
    
    // Legacy iOS colors for compatibility
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#FAFAFA',
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
    // Stripe-style subtle shadows
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    card: {
      shadowColor: '#0A2540',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    cardHover: {
      shadowColor: '#0A2540',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#0A2540',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.12,
      shadowRadius: 16,
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