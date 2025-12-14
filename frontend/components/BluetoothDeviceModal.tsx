/**
 * BluetoothDeviceModal - Modal to list and connect to Bluetooth devices
 * Follows the app's dark theme design language
 */

import { Colors, FontFamily, FontSizes, Spacing } from '@/constants/theme';
import { BluetoothDevice } from '@/hooks/use-bluetooth';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface BluetoothDeviceModalProps {
  visible: boolean;
  onClose: () => void;
  devices: BluetoothDevice[];
  connectedDevice: BluetoothDevice | null;
  isScanning: boolean;
  onScan: () => void;
  onConnect: (device: BluetoothDevice) => Promise<boolean>;
  onDisconnect: () => void;
  error: string | null;
}

export function BluetoothDeviceModal({
  visible,
  onClose,
  devices,
  connectedDevice,
  isScanning,
  onScan,
  onConnect,
  onDisconnect,
  error,
}: BluetoothDeviceModalProps) {
  
  const handleDevicePress = async (device: BluetoothDevice) => {
    if (connectedDevice?.id === device.id) {
      // Already connected - disconnect
      onDisconnect();
    } else {
      // Connect to new device
      await onConnect(device);
    }
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => {
    const isConnected = connectedDevice?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isConnected && styles.deviceItemConnected]}
        onPress={() => handleDevicePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceAddress}>{item.address}</Text>
        </View>
        <View style={[styles.statusIndicator, isConnected && styles.statusConnected]}>
          <Text style={styles.statusText}>
            {isConnected ? 'CONNECTED' : 'TAP TO CONNECT'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={e => e.stopPropagation()}
            style={styles.modal}
          >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Bluetooth Devices</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {/* Device list */}
          <View style={styles.listContainer}>
            {devices.length === 0 && !isScanning ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No paired devices found</Text>
                <Text style={styles.emptyHint}>
                  Pair your HC-05 module in phone settings first
                </Text>
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.id}
                renderItem={renderDevice}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
          
          {/* Scan button */}
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
            onPress={onScan}
            disabled={isScanning}
            activeOpacity={0.7}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Text style={styles.scanButtonText}>SCAN FOR DEVICES</Text>
            )}
          </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: Colors.backgroundDark,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: 'rgba(186, 45, 45, 0.2)',
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 2,
  },
  errorText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.statusOvertime,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    minHeight: 150,
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.7,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  deviceItemConnected: {
    borderColor: Colors.statusOccupied,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  deviceAddress: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  statusIndicator: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  statusConnected: {
    backgroundColor: Colors.statusOccupied,
  },
  statusText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  scanButton: {
    backgroundColor: Colors.accentBlue,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
});

export default BluetoothDeviceModal;
