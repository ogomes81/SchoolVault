import React, { useEffect } from 'react';
import { Animated, ViewProps } from 'react-native';

interface FadeInViewProps extends ViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
}

export default function FadeInView({
  children,
  duration = 500,
  delay = 0,
  style,
  ...props
}: FadeInViewProps) {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}