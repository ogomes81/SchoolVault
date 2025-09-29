import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  GestureResponderEvent,
} from 'react-native';

interface AnimatedButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: any;
  textStyle?: any;
  disabled?: boolean;
  testID?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function AnimatedButton({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  testID,
  variant = 'primary',
}: AnimatedButtonProps) {
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.button, styles.primaryButton];
      case 'secondary':
        return [styles.button, styles.secondaryButton];
      case 'danger':
        return [styles.button, styles.dangerButton];
      default:
        return [styles.button, styles.primaryButton];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.buttonText, styles.primaryText];
      case 'secondary':
        return [styles.buttonText, styles.secondaryText];
      case 'danger':
        return [styles.buttonText, styles.dangerText];
      default:
        return [styles.buttonText, styles.primaryText];
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          ...getButtonStyle(),
          disabled && styles.disabledButton,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        testID={testID}
        activeOpacity={0.8}
      >
        <Text
          style={[
            ...getTextStyle(),
            disabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: '#374151',
  },
  dangerText: {
    color: 'white',
  },
  disabledText: {
    color: '#6b7280',
  },
});