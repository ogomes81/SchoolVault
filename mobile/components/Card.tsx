import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewProps,
  GestureResponderEvent,
} from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'md',
  ...props
}: CardProps) {
  const getCardStyle = () => {
    const baseStyle = [styles.card];
    
    switch (variant) {
      case 'elevated':
        baseStyle.push(styles.elevated);
        break;
      case 'outlined':
        baseStyle.push(styles.outlined);
        break;
      default:
        baseStyle.push(styles.default);
    }

    switch (padding) {
      case 'none':
        baseStyle.push(styles.paddingNone);
        break;
      case 'sm':
        baseStyle.push(styles.paddingSm);
        break;
      case 'lg':
        baseStyle.push(styles.paddingLg);
        break;
      default:
        baseStyle.push(styles.paddingMd);
    }

    return baseStyle;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[...getCardStyle(), style]}
        onPress={onPress}
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[...getCardStyle(), style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: 'white',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: 'transparent',
    elevation: 0,
  },
  paddingNone: {
    padding: 0,
  },
  paddingSm: {
    padding: 12,
  },
  paddingMd: {
    padding: 16,
  },
  paddingLg: {
    padding: 20,
  },
});