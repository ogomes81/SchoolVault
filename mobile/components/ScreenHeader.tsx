import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

interface ScreenHeaderProps {
  title: string;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
}

export default function ScreenHeader({
  title,
  onBackPress,
  rightComponent,
  backgroundColor = 'white',
}: ScreenHeaderProps) {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={[styles.header, { backgroundColor }]}>
        <View style={styles.leftSection}>
          {onBackPress && (
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerSection}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leftSection: {
    width: 80,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 80,
    alignItems: 'flex-end',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '400',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});