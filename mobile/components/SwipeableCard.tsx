import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ViewProps,
} from 'react-native';
import { theme } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeableCardProps extends ViewProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPress?: () => void;
  enabled?: boolean;
  index?: number;
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  enabled = true,
  index = 0,
  style,
  ...props
}: SwipeableCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enabled && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        Animated.spring(scale, {
          toValue: 1.05,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          const direction = gestureState.dx > 0 ? 1 : -1;
          
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: direction * SCREEN_WIDTH * 1.5, y: gestureState.dy },
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (direction > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (direction < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          });
        } else {
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 4,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const opacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });

  // Calculate transform based on card index (for stacking effect)
  const stackTransform = index * 8;
  const stackOpacity = Math.max(0.4, 1 - index * 0.2);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: enabled ? rotate : '0deg' },
            { scale },
            { translateY: stackTransform },
          ],
          opacity: enabled ? opacity : stackOpacity,
          zIndex: 100 - index,
        },
        style,
      ]}
      {...panResponder.panHandlers}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    ...theme.shadows.card,
  },
});