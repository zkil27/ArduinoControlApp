/**
 * Bluetooth Classic Hook for HC-05 Communication
 * 
 * Data format from Arduino:
 * - Sensor data: "SENSOR:P1:523" (slot name, photoresistor value 0-1023)
 * - Status: "STATUS:P1:occupied" or "STATUS:P1:vacant"
 * - Ping response: "PONG:P1"
 */

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

// Types
export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
}

export interface SlotData {
  slotName: string;
  status: 'occupied' | 'vacant' | 'overtime';
  sensorValue: number;
  lastUpdated: Date;
  occupiedSince: Date | null;  // Track when parking started
}

interface BluetoothState {
  isEnabled: boolean;
  isConnected: boolean;
  connectedDevice: BluetoothDevice | null;
  rssi: number | null;
  slots: Map<string, SlotData>;
}

// Billing rates (should match Supabase billing_config)
const RATE_PER_HOUR = 25.00;
const OVERTIME_RATE_PER_HOUR = 100.00;
const OVERTIME_THRESHOLD_MINUTES = 180;

// Try to import the library, but handle if it's not available
let RNBluetoothClassic: any = null;
try {
  RNBluetoothClassic = require('react-native-bluetooth-classic').default;
} catch (e) {
  console.warn('Bluetooth Classic not available - using mock mode');
}

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>({
    isEnabled: false,
    isConnected: false,
    connectedDevice: null,
    rssi: null,
    slots: new Map(),
  });
  
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const subscriptionRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);

  // Save completed parking session to Supabase
  const saveParkingSession = useCallback(async (
    slotName: string,
    occupiedSince: Date,
    endedAt: Date
  ) => {
    try {
      const durationMinutes = Math.floor(
        (endedAt.getTime() - occupiedSince.getTime()) / 60000
      );
      
      // Calculate billing
      let amountCharged: number;
      const wasOvertime = durationMinutes > OVERTIME_THRESHOLD_MINUTES;
      
      if (durationMinutes <= OVERTIME_THRESHOLD_MINUTES) {
        amountCharged = (durationMinutes / 60) * RATE_PER_HOUR;
      } else {
        const regularMinutes = OVERTIME_THRESHOLD_MINUTES;
        const overtimeMinutes = durationMinutes - OVERTIME_THRESHOLD_MINUTES;
        amountCharged = 
          (regularMinutes / 60) * RATE_PER_HOUR +
          (overtimeMinutes / 60) * OVERTIME_RATE_PER_HOUR;
      }
      
      // Get slot_id from database (optional, for foreign key)
      const { data: slotData } = await supabase
        .from('parking_slots')
        .select('id')
        .eq('name', slotName)
        .single();
      
      // Insert session record
      const { error } = await supabase
        .from('parking_sessions')
        .insert({
          slot_id: slotData?.id || null,
          slot_name: slotName,
          started_at: occupiedSince.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_minutes: durationMinutes,
          amount_charged: Math.round(amountCharged * 100) / 100,
          was_overtime: wasOvertime,
        });
      
      if (error) {
        console.error('Failed to save parking session:', error);
      } else {
        console.log(`Session saved: ${slotName} - ${durationMinutes} mins - ₱${amountCharged.toFixed(2)}`);
      }
    } catch (err) {
      console.error('Error saving parking session:', err);
    }
  }, []);

  // Request Bluetooth permissions (Android)
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return Object.values(granted).every(
          (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Permission request failed:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }, []);

  // Check if Bluetooth is enabled
  const checkBluetoothEnabled = useCallback(async () => {
    if (!RNBluetoothClassic) {
      // Mock mode for development
      setState(prev => ({ ...prev, isEnabled: true }));
      return true;
    }
    
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      setState(prev => ({ ...prev, isEnabled: enabled }));
      return enabled;
    } catch (err) {
      console.error('Error checking Bluetooth:', err);
      return false;
    }
  }, []);

  // Scan for paired devices
  const scanForDevices = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setError('Bluetooth permissions not granted');
      return;
    }

    const enabled = await checkBluetoothEnabled();
    if (!enabled) {
      setError('Please enable Bluetooth');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      if (!RNBluetoothClassic) {
        // Mock devices for development
        setAvailableDevices([
          { id: 'mock-hc05', name: 'HC-05', address: '00:00:00:00:00:00' },
        ]);
        setIsScanning(false);
        return;
      }
      
      // Get bonded (paired) devices - HC-05 needs to be paired first
      const paired = await RNBluetoothClassic.getBondedDevices();
      const devices: BluetoothDevice[] = paired.map((d: any) => ({
        id: d.id || d.address,
        name: d.name || 'Unknown Device',
        address: d.address,
      }));
      
      setAvailableDevices(devices);
    } catch (err: any) {
      setError(err.message || 'Failed to scan devices');
    } finally {
      setIsScanning(false);
    }
  }, [requestPermissions, checkBluetoothEnabled]);

  // Parse incoming data from Arduino
  const parseArduinoData = useCallback((data: string) => {
    const lines = data.trim().split('\n');
    
    lines.forEach(line => {
      const parts = line.trim().split(':');
      if (parts.length < 2) return;
      
      const command = parts[0].toUpperCase();
      
      switch (command) {
        case 'SENSOR': {
          // Format: SENSOR:P1:523
          const [, slotName, valueStr] = parts;
          const sensorValue = parseInt(valueStr, 10);
          if (!isNaN(sensorValue)) {
            // Determine status based on sensor value
            // Low value = something blocking light = occupied
            const newStatus = sensorValue < 500 ? 'occupied' : 'vacant';
            
            setState(prev => {
              const newSlots = new Map(prev.slots);
              const existing = newSlots.get(slotName);
              const previousStatus = existing?.status || 'vacant';
              const now = new Date();
              
              // Check for status transition
              if (previousStatus !== 'vacant' && newStatus === 'vacant') {
                // Vehicle left - save session to Supabase
                const occupiedSince = existing?.occupiedSince;
                if (occupiedSince) {
                  saveParkingSession(slotName, occupiedSince, now);
                }
              }
              
              // Set occupiedSince when becoming occupied
              const occupiedSince = 
                newStatus === 'occupied' && previousStatus === 'vacant'
                  ? now  // Just became occupied
                  : newStatus === 'occupied'
                    ? existing?.occupiedSince || now  // Keep existing time
                    : null;  // Vacant, no occupied time
              
              newSlots.set(slotName, {
                slotName,
                sensorValue,
                status: newStatus,
                lastUpdated: now,
                occupiedSince,
              });
              return { ...prev, slots: newSlots };
            });
          }
          break;
        }
        
        case 'STATUS': {
          // Format: STATUS:P1:occupied
          const [, slotName, statusStr] = parts;
          const newStatus = statusStr?.toLowerCase() as 'occupied' | 'vacant' | 'overtime';
          if (newStatus && ['occupied', 'vacant', 'overtime'].includes(newStatus)) {
            setState(prev => {
              const newSlots = new Map(prev.slots);
              const existing = newSlots.get(slotName);
              const previousStatus = existing?.status || 'vacant';
              const now = new Date();
              
              // Check for status transition
              if (previousStatus !== 'vacant' && newStatus === 'vacant') {
                // Vehicle left - save session to Supabase
                const occupiedSince = existing?.occupiedSince;
                if (occupiedSince) {
                  saveParkingSession(slotName, occupiedSince, now);
                }
              }
              
              // Set occupiedSince when becoming occupied
              const occupiedSince = 
                newStatus === 'occupied' && previousStatus === 'vacant'
                  ? now
                  : newStatus === 'occupied' || newStatus === 'overtime'
                    ? existing?.occupiedSince || now
                    : null;
              
              newSlots.set(slotName, {
                slotName,
                status: newStatus,
                sensorValue: existing?.sensorValue || 0,
                lastUpdated: now,
                occupiedSince,
              });
              return { ...prev, slots: newSlots };
            });
          }
          break;
        }
        
        case 'PONG': {
          // Format: PONG:P1 - response to ping
          console.log('Ping response received:', parts[1]);
          break;
        }
        
        case 'RSSI': {
          // Format: RSSI:-65
          const rssi = parseInt(parts[1], 10);
          if (!isNaN(rssi)) {
            setState(prev => ({ ...prev, rssi }));
          }
          break;
        }
      }
    });
  }, [saveParkingSession]);

  // Connect to a device
  const connectToDevice = useCallback(async (device: BluetoothDevice) => {
    try {
      setError(null);
      
      if (!RNBluetoothClassic) {
        // Mock connection for development
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectedDevice: device,
          rssi: -65,
        }));
        
        // Simulate receiving data
        const mockInterval = setInterval(() => {
          const mockData = `SENSOR:P1:${Math.floor(Math.random() * 1024)}\nSENSOR:P2:${Math.floor(Math.random() * 1024)}\nSENSOR:P3:${Math.floor(Math.random() * 1024)}\nSENSOR:P4:${Math.floor(Math.random() * 1024)}`;
          parseArduinoData(mockData);
        }, 2000);
        
        connectionRef.current = mockInterval;
        return true;
      }
      
      // Connect to the device
      const connected = await RNBluetoothClassic.connectToDevice(device.address);
      
      if (connected) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectedDevice: device,
        }));
        
        // Subscribe to incoming data
        subscriptionRef.current = RNBluetoothClassic.onDeviceRead(
          device.address,
          (data: { data: string }) => {
            parseArduinoData(data.data);
          }
        );
        
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      return false;
    }
  }, [parseArduinoData]);

  // Disconnect from device
  const disconnect = useCallback(async () => {
    try {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove?.();
        subscriptionRef.current = null;
      }
      
      if (connectionRef.current) {
        clearInterval(connectionRef.current);
        connectionRef.current = null;
      }
      
      if (RNBluetoothClassic && state.connectedDevice) {
        await RNBluetoothClassic.disconnectFromDevice(state.connectedDevice.address);
      }
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectedDevice: null,
        rssi: null,
      }));
    } catch (err: any) {
      console.error('Disconnect error:', err);
    }
  }, [state.connectedDevice]);

  // Send command to Arduino
  const sendCommand = useCallback(async (command: string): Promise<boolean> => {
    if (!state.isConnected || !state.connectedDevice) {
      setError('Not connected to device');
      return false;
    }
    
    try {
      if (!RNBluetoothClassic) {
        // Mock sending
        console.log('Mock send:', command);
        return true;
      }
      
      await RNBluetoothClassic.writeToDevice(
        state.connectedDevice.address,
        command + '\n'
      );
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to send command');
      return false;
    }
  }, [state.isConnected, state.connectedDevice]);

  // Send PING command
  const pingSlot = useCallback(async (slotName: string) => {
    return sendCommand(`PING:${slotName}`);
  }, [sendCommand]);

  // Send DISABLE command
  const disableSlot = useCallback(async (slotName: string, disable: boolean) => {
    return sendCommand(`${disable ? 'DISABLE' : 'ENABLE'}:${slotName}`);
  }, [sendCommand]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove?.();
      }
      if (connectionRef.current) {
        clearInterval(connectionRef.current);
      }
    };
  }, []);

  // Check Bluetooth on mount
  useEffect(() => {
    checkBluetoothEnabled();
  }, [checkBluetoothEnabled]);

  return {
    // State
    isEnabled: state.isEnabled,
    isConnected: state.isConnected,
    connectedDevice: state.connectedDevice,
    rssi: state.rssi,
    slots: state.slots,
    availableDevices,
    isScanning,
    error,
    
    // Actions
    scanForDevices,
    connectToDevice,
    disconnect,
    sendCommand,
    pingSlot,
    disableSlot,
  };
}
