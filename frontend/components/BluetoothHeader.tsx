import { Colors, FontFamily, FontSizes, Spacing, getBluetoothStatus } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BluetoothHeaderProps {
  rssi: number | null;
  isConnected: boolean;
  onSettingsPress?: () => void;
}

export function BluetoothHeader({
  rssi,
  isConnected,
  onSettingsPress,
}: BluetoothHeaderProps) {
  const { label, color } = getBluetoothStatus(rssi, isConnected);
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.statusContainer}>
        <Text style={styles.label}>Bluetooth Status: </Text>
        <Text style={[styles.status, { color }]}>{label}</Text>
      </View>
      
      <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
        <View style={styles.settingsIcon}>
          <Text style={styles.settingsIconText}>⚙</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
  },
  status: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  settingsIcon: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
  },
});

export default BluetoothHeader;
