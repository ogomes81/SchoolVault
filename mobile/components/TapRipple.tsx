import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  GestureResponderEvent,
  ViewProps,
} from 'react-native';

interface TapRippleProps extends ViewProps {
  children: React.ReactNode;
  onPress: (event: GestureResponderEvent) => void;
  delay?: number;
  rippleColor?: string;
  disabled?: boolean;
}

export default function TapRipple({
  children,
  onPress,
  delay = 100,
  rippleColor = 'rgba(99, 91, 255, 0.1)',
  disabled = false,
  style,
  ...props
}: TapRippleProps) {
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;

    // Start ripple animation
    rippleOpacity.setValue(1);
    rippleScale.setValue(0);

    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Delay the actual action slightly for better UX
    setTimeout(() => {
      onPress(event);
    }, delay);
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      <Animated.View
        style={[
          styles.ripple,
          {
            backgroundColor: rippleColor,
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          },
        ]}
      />
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
});