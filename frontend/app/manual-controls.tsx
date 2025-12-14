import { BluetoothHeader } from '@/components/BluetoothHeader';
import { WebHeader } from '@/components/WebHeader';
import { Colors, FontFamily } from '@/constants/theme';
import { useBluetooth } from '@/hooks/use-bluetooth';
import { useParkingSlots } from '@/hooks/use-parking';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom Button Component for the "Double Border" look
interface ManualControlButtonProps {
  title: string;
  actionLabel: string;
  onPress: () => void;
  style?: any;
}

const ManualControlButton = ({ title, actionLabel, onPress, style }: ManualControlButtonProps) => (
  <TouchableOpacity style={[styles.controlButton, style]} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.controlButtonInner}>
      <Text style={styles.buttonTitle}>{title}</Text>
      <View style={styles.actionContainer}>
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function ManualControlsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    isConnected: btConnected, 
    rssi: btRssi, 
    scanForDevices,
    pingSlot
  } = useBluetooth();
  
  const { addVirtualSlot, removeLastSlot, resetParkingSlots, simulateTraffic, vacateAllSlots, slots } = useParkingSlots();

  // Handlers
  const handleResetSlots = async () => {
    console.log('Resetting to P1-P5...');
    await resetParkingSlots();
  };
  
  const handleVacateAll = async () => {
    console.log('Vacating all slots...');
    await vacateAllSlots();
  };

  const handleExitServo = () => console.log('Open Exit Servo');
  const handleEntryServo = () => console.log('Open Entry Servo');
  
  const handleAddVirtualOccupied = async () => {
    console.log('Adding Occupied Slot...');
    await addVirtualSlot('occupied');
  };
  
  const handleAddVirtualSlot = async () => {
    console.log('Adding Vacant Slot...');
    await addVirtualSlot('vacant');
  };
  
  const handleRemoveSlot = async () => {
    console.log('Removing Last Slot...');
    await removeLastSlot();
  };
  
  const handlePingAll = async () => {
    console.log('Pinging all devices...');
    if (!btConnected) {
      console.log('Bluetooth not connected');
      return;
    }
    
    // Ping all slots found in the database
    for (const slot of slots) {
      console.log(`Pinging ${slot.name}`);
      await pingSlot(slot.name);
      // Small delay between pings to prevent congestion
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };
  
  const handleSimulateTraffic = async () => {
    console.log('Simulating Traffic...');
    const result = await simulateTraffic();
    if (result.success) {
      console.log(`Updated ${result.slotName} to ${result.newStatus}`);
    }
  };

  // ============================================
  // CONFIGURATION: Add/Remove Buttons Here
  // ============================================
  const controls = [
    // Row 1: Hardware Controls
    {
      id: 'entry-servo',
      title: 'ENTRY SERVO',
      actionLabel: 'OPEN',
      onPress: handleEntryServo,
    },
    {
      id: 'exit-servo',
      title: 'EXIT SERVO',
      actionLabel: 'OPEN',
      onPress: handleExitServo,
    },
    // Row 2: Slot Management
    {
      id: 'add-vacant',
      title: 'ADD VIRTUAL VACANT PARKING SLOT',
      actionLabel: 'ADD',
      onPress: handleAddVirtualSlot,
    },
    {
      id: 'add-occupied',
      title: 'ADD VIRTUAL OCCUPIED PARKING SLOT',
      actionLabel: 'ADD',
      onPress: handleAddVirtualOccupied,
    },
    // Row 3: Simulations
    {
      id: 'ping-all',
      title: 'PING ALL DEVICES',
      actionLabel: 'TEST',
      onPress: handlePingAll,
    },
    {
      id: 'simulate-traffic',
      title: 'SIMULATE TRAFFIC',
      actionLabel: 'RANDOM',
      onPress: handleSimulateTraffic,
    },
    // Row 4: Maintenance
    {
      id: 'clear-all',
      title: 'CLEAR PARKING STATUS',
      actionLabel: 'VACATE ALL',
      onPress: handleVacateAll,
      style: { borderColor: '#ba2d2d' }, // Red border for danger
    },
    {
      id: 'remove-slot',
      title: 'REMOVE PARKING SLOT',
      actionLabel: 'REMOVE',
      onPress: handleRemoveSlot,
      style: { borderColor: '#ba2d2d' }, // Red border for danger
    },
    {
      id: 'reset-slots',
      title: 'RESET SLOT DATA',
      actionLabel: 'RESET',
      onPress: handleResetSlots,
      style: { borderColor: '#ba2d2d' }, // Red border for danger
    },
  ];

  return (
    <View style={styles.container}>
      {/* ... Header ... */}
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {Platform.OS === 'web' ? (
        <WebHeader title="MANUAL CONTROL" isConnected={btConnected} rssi={btRssi} />
      ) : (
        <BluetoothHeader
          rssi={btRssi}
          isConnected={btConnected}
          onStatusPress={scanForDevices}
          onSettingsPress={() => router.navigate('/(tabs)/dashboard')}
          isActive={true}
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>MANUAL CONTROL:</Text>

        <View style={styles.grid}>
          {controls.map((control) => (
            <ManualControlButton 
              key={control.id}
              title={control.title} 
              actionLabel={control.actionLabel} 
              onPress={control.onPress} 
              style={control.style}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Green Line */}
      {Platform.OS !== 'web' && (
        <View style={styles.bottomLine}>
          <View style={[styles.greenLine, { height: 13 + insets.bottom }]} />
        </View>
      )}
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const gap = 12; // Gap between cards
const padding = 20; // Screen horizontal padding
// Calculate card width: (Screen Width - (2 * Padding) - Gap) / 2 columns
const cardWidth = (screenWidth - (padding * 2) - gap) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: padding,
    paddingBottom: 100, // Space for bottom line
  },
  pageTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 24,
    marginTop: 8,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: gap,
    justifyContent: 'space-between',
  },
  controlButton: {
    width: Platform.OS === 'web' ? '48%' : cardWidth,
    height: 200, // Tall portrait aspect ratio like image
    borderWidth: 1,
    borderColor: '#272727',
    padding: 6, // Outer padding for the "double border" effect
    marginBottom: 12,
  },
  controlButtonInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#272727',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonTitle: {
    fontFamily: FontFamily.mono,
    color: '#ededed',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.mono,
    color: '#ededed',
    fontSize: 16,
    letterSpacing: 1,
  },
  singleItem: {
    // If you want the last item to be same width, keep as is.
    // If you want it full width, set width: '100%'.
    // Based on image, it looks like same width but in a new row.
  },
  backButton: {
    marginTop: 32,
    alignSelf: 'center',
    padding: 16,
  },
  backButtonText: {
    fontFamily: FontFamily.mono,
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  greenLine: {
    backgroundColor: Colors.accentGreen,
  },
});
