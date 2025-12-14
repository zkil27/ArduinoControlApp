/**
 * WebHeader - Desktop header bar for web
 * Shows page title and Bluetooth status on the right
 */

import { Colors, FontFamily, FontSizes, Spacing } from '@/constants/theme';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface WebHeaderProps {
  title: string;
  isConnected?: boolean;
  rssi?: number | null;
}

export function WebHeader({ title, isConnected = false, rssi }: WebHeaderProps) {
  if (Platform.OS !== 'web') {
    return null;
  }
  
  const getConnectionStatus = () => {
    if (!isConnected) {
      return { label: 'Disconnected', color: Colors.textSecondary };
    }
    if (rssi && rssi > -60) {
      return { label: 'Strong Connection', color: Colors.statusOccupied };
    }
    if (rssi && rssi > -80) {
      return { label: 'Weak Connection', color: Colors.accentYellow };
    }
    return { label: 'Connected', color: Colors.accentBlue };
  };
  
  const status = getConnectionStatus();
  
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
  },
});
