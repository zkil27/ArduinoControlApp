import { BluetoothHeader } from '@/components/BluetoothHeader';
import { SlotCard, SlotStatus } from '@/components/SlotCard';
import { SlotDetailsModal } from '@/components/SlotDetailsModal';
import { Colors, FontFamily, FontSizes, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/hooks/use-bluetooth';
import {
  useDeviceCommands,
  useDeviceStatus,
  useParkingSlots,
  useSlotDetails
} from '@/hooks/use-parking';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function DashboardScreen() {
  const { slots, loading, error, refresh } = useParkingSlots();
  const { status: deviceStatus } = useDeviceStatus();
  const { sendPingCommand, sendDisableCommand, loading: commandLoading } = useDeviceCommands();
  
  // Bluetooth connection
  const { 
    isConnected: btConnected, 
    rssi: btRssi,
    pingSlot,
    disableSlot,
    slots: btSlots,
  } = useBluetooth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const { 
    slot: selectedSlot, 
    latestReading: selectedSlotSensorData 
  } = useSlotDetails(selectedSlotId);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Handle card press to open modal
  const handleCardPress = useCallback((slotId: string) => {
    setSelectedSlotId(slotId);
    setModalVisible(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    // Small delay before clearing selected slot to avoid UI flicker
    setTimeout(() => setSelectedSlotId(null), 300);
  }, []);

  // Handle Ping LED command - sends via Bluetooth
  const handlePingLED = useCallback(async () => {
    if (selectedSlot) {
      const slotName = selectedSlot.name;
      console.log('Sending PING command for:', slotName);
      await pingSlot(slotName);
    }
  }, [selectedSlot, pingSlot]);

  // Handle Disable Slot command - sends via Bluetooth AND updates database
  const handleDisable = useCallback(async () => {
    if (selectedSlot) {
      const slotName = selectedSlot.name;
      const slotId = selectedSlot.id;
      const currentlyDisabled = selectedSlot.is_disabled;
      console.log(`Sending ${currentlyDisabled ? 'ENABLE' : 'DISABLE'} command for:`, slotName);
      
      try {
        // Send Bluetooth command to Arduino
        const btResult = await disableSlot(slotName, !currentlyDisabled);
        console.log('Bluetooth command result:', btResult);
        
        // Update database
        const dbResult = await sendDisableCommand(slotId, !currentlyDisabled);
        console.log('Database update result:', dbResult);
        
        handleModalClose();
      } catch (err) {
        console.error('Error in handleDisable:', err);
      }
    } else {
      console.log('No selected slot for disable command');
    }
  }, [selectedSlot, disableSlot, sendDisableCommand, handleModalClose]);

  // Calculate slot data for modal
  const modalData = useMemo(() => {
    if (!selectedSlot || !selectedSlot.slot_status) return null;
    
    const status = selectedSlot.slot_status.status;
    const occupiedSince = selectedSlot.slot_status.occupied_since;
    
    let elapsedMinutes = 0;
    let startTime: Date | undefined;
    
    if (occupiedSince && (status === 'occupied' || status === 'overtime')) {
      startTime = new Date(occupiedSince);
      elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
    }
    
    return {
      slotName: selectedSlot.name,
      status,
      startTime,
      elapsedMinutes,
      allowedMinutes: selectedSlot.allowed_minutes,
      sensorValue: selectedSlotSensorData?.photoresistor_value ?? null,
      isDisabled: selectedSlot.is_disabled,
    };
  }, [selectedSlot, selectedSlotSensorData]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <BluetoothHeader
          rssi={btRssi}
          isConnected={btConnected}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading parking slots...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <BluetoothHeader
          rssi={btRssi}
          isConnected={btConnected}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error loading slots</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      </View>
    );
  }

  // Separate slots into regular and placeholder
  const regularSlots = slots.filter(s => !s.is_placeholder);
  const addSlot = slots.find(s => s.is_placeholder);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <BluetoothHeader
        rssi={btRssi}
        isConnected={btConnected}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.card}
          />
        }
      >
        <View style={styles.grid}>
          {/* Regular parking slots */}
          {regularSlots.map((slot) => {
            const slotStatus = slot.slot_status;
            const status: SlotStatus = slotStatus?.status || 'vacant';
            const occupiedSince = slotStatus?.occupied_since;
            
            let elapsedMinutes = 0;
            if (occupiedSince && (status === 'occupied' || status === 'overtime')) {
              elapsedMinutes = Math.floor(
                (Date.now() - new Date(occupiedSince).getTime()) / (1000 * 60)
              );
            }
            
            return (
              <SlotCard
                key={slot.id}
                slotId={slot.id}
                slotName={slot.name}
                status={status}
                elapsedMinutes={elapsedMinutes}
                allowedMinutes={slot.allowed_minutes}
                onPress={handleCardPress}
              />
            );
          })}
          
          {/* Add Slot placeholder */}
          {addSlot && (
            <SlotCard
              key={addSlot.id}
              slotId={addSlot.id}
              slotName={addSlot.name}
              status="add"
              elapsedMinutes={0}
              allowedMinutes={0}
              onPress={() => {
                // TODO: Implement add slot functionality
                console.log('Add new parking slot');
              }}
            />
          )}
        </View>
      </ScrollView>
      
      {/* Slot Details Modal */}
      {modalData && (
        <SlotDetailsModal
          visible={modalVisible}
          onClose={handleModalClose}
          slotName={modalData.slotName}
          status={modalData.status}
          startTime={modalData.startTime}
          elapsedMinutes={modalData.elapsedMinutes}
          allowedMinutes={modalData.allowedMinutes}
          sensorValue={modalData.sensorValue ?? undefined}
          isDisabled={modalData.isDisabled}
          onPingLED={handlePingLED}
          onDisable={handleDisable}
          commandLoading={commandLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.lg,
    color: Colors.overtime,
    marginBottom: Spacing.sm,
  },
  errorDetail: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 120, // Extra padding for tab bar
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
