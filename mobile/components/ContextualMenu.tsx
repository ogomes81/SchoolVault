import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { theme } from '../styles/theme';

interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}

interface ContextualMenuProps {
  visible: boolean;
  actions: MenuAction[];
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
}

export default function ContextualMenu({
  visible,
  actions,
  onClose,
  anchorPosition = { x: 0, y: 0 },
}: ContextualMenuProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      <Animated.View
        style={[
          styles.menu,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
            top: anchorPosition.y,
            right: 16,
          },
        ]}
      >
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index < actions.length - 1 && styles.menuItemBorder,
            ]}
            onPress={() => {
              action.onPress();
              onClose();
            }}
          >
            {action.icon && <View style={styles.icon}>{action.icon}</View>}
            <Text
              style={[
                styles.menuItemText,
                action.destructive && styles.destructiveText,
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    minWidth: 180,
    ...theme.shadows.cardHover,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  icon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  destructiveText: {
    color: theme.colors.error,
  },
});