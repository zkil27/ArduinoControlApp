/**
 * Settings Screen
 * Green-themed settings page with placeholder buttons
 */

import { AboutUsModal } from '@/components/AboutUsModal';
import { BluetoothDeviceModal } from '@/components/BluetoothDeviceModal';
import { BluetoothHeader } from '@/components/BluetoothHeader';
import { WebHeader } from '@/components/WebHeader';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/hooks/use-bluetooth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    isConnected: btConnected, 
    rssi: btRssi,
    availableDevices,
    isScanning,
    error: btError,
    scanForDevices,
    connectToDevice,
    disconnect,
    connectedDevice,
  } = useBluetooth();
  
  const [btModalVisible, setBtModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  
  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Header - Adaptive for Web/Mobile */}
      {Platform.OS === 'web' ? (
        <WebHeader 
          title="SETTINGS" 
          isConnected={btConnected} 
          rssi={btRssi} 
        />
      ) : (
        <BluetoothHeader
          rssi={btRssi}
          isConnected={btConnected}
          onStatusPress={() => {
            scanForDevices();
            setBtModalVisible(true);
          }}
          onSettingsPress={() => router.back()} 
          isActive={true}
        />
      )}
      
      {/* Bluetooth Device Selection Modal */}
      <BluetoothDeviceModal
        visible={btModalVisible}
        onClose={() => setBtModalVisible(false)}
        devices={availableDevices}
        connectedDevice={connectedDevice}
        isScanning={isScanning}
        onScan={scanForDevices}
        onConnect={connectToDevice}
        onDisconnect={disconnect}
        error={btError}
      />
      
      <AboutUsModal 
        visible={aboutModalVisible} 
        onClose={() => setAboutModalVisible(false)} 
      />
      
      {/* Content Container - for Web responsiveness */}
      <View style={Platform.OS === 'web' ? styles.webContent : { flex: 1 }}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>ADDITIONAL SETTINGS</Text>
        </View>
        
        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Manual Control - White filled */}
          <TouchableOpacity 
            style={[styles.buttonFilled, styles.buttonWhite]} 
            activeOpacity={0.7}
            onPress={() => router.push('/manual-controls')}
          >
            <Text style={styles.buttonFilledTextBlack}>MANUAL CONTROL</Text>
          </TouchableOpacity>
          
          {/* Dev Mode - Blue filled */}
          <TouchableOpacity style={[styles.buttonFilled, styles.buttonBlue]} activeOpacity={0.7}>
            <Text style={styles.buttonFilledTextBlack}>DEV MODE</Text>
          </TouchableOpacity>
          
          {/* Export Statistics - Green filled */}
          <TouchableOpacity style={[styles.buttonFilled, styles.buttonGreen]} activeOpacity={0.7}>
            <Text style={styles.buttonFilledTextBlack}>EXPORT STATISTICS</Text>
          </TouchableOpacity>
          
          {/* About Us - Pink filled */}
          <TouchableOpacity 
            style={[styles.buttonFilled, styles.buttonPink]} 
            activeOpacity={0.7}
            onPress={() => setAboutModalVisible(true)}
          >
            <Text style={styles.buttonFilledTextBlack}>ABOUT US</Text>
          </TouchableOpacity>
          
          {/* Back - Red filled */}
          <TouchableOpacity 
            style={[styles.buttonFilled, styles.buttonRed]} 
            activeOpacity={0.7}
            onPress={handleBack}
          >
            <Text style={styles.buttonFilledTextBlack}>BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Green bottom line - Hide on web if desired, or keep */}
      {Platform.OS !== 'web' && (
        <View style={styles.bottomLine}>
          <View style={[styles.greenLine, { height: 13 + insets.bottom }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.mono,
    fontSize: 12,
  },
  status: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontStyle: 'italic',
  },
  gearIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    color: Colors.accentGreen,
    fontSize: 18,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.mono,
    fontSize: 24,
    letterSpacing: 2,
  },
  buttonsContainer: {
    paddingHorizontal: 40,
    gap: 40,
  },
  buttonFilled: {
    height: 50,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWhite: {
    backgroundColor: '#EDEDED',
  },
  buttonBlue: {
    backgroundColor: Colors.accentBlue,
  },
  buttonGreen: {
    backgroundColor: Colors.accentGreen,
  },
  buttonPink: {
    backgroundColor: Colors.accentPink, // or Colors.statusWarning if accentPink is not vibrant enough
  },
  buttonRed: {
    backgroundColor: Colors.statusOvertime,
  },
  buttonFilledTextBlack: {
    color: '#000000',
    fontFamily: FontFamily.mono,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  greenLine: {
    height: 25,
    backgroundColor: Colors.accentGreen,
  },
});
