import type { SlotStatus } from '@/components/SlotCard';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface ParkingSlot {
  id: string;
  name: string;
  allowed_minutes: number;
  is_disabled: boolean;
  is_placeholder: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlotStatusData {
  id: string;
  slot_id: string;
  status: SlotStatus;
  occupied_since: string | null;
  updated_at: string;
}

export interface ParkingSlotWithStatus extends ParkingSlot {
  slot_status: SlotStatusData | null;
}

// ============================================
// HOOK: useParkingSlots
// Fetches all parking slots with real-time updates
// ============================================

export function useParkingSlots() {
  const [slots, setSlots] = useState<ParkingSlotWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('parking_slots')
        .select(`
          *,
          slot_status (*)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setSlots(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();

    // Subscribe to parking_slots changes
    const slotsChannel = supabase
      .channel('parking_slots_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_slots' },
        () => {
          console.log('Parking slots changed');
          fetchSlots();
        }
      )
      .subscribe();

    // Subscribe to slot_status changes
    const statusChannel = supabase
      .channel('slot_status_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slot_status' },
        () => {
          console.log('Slot status changed');
          fetchSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [fetchSlots]);

  return {
    slots,
    loading,
    error,
    refresh: fetchSlots,
  };
}

// ============================================
// HOOK: useSlotDetails
// Fetches a single slot with sensor data
// ============================================

export interface SensorReading {
  id: string;
  slot_id: string;
  photoresistor_value: number;
  is_occupied: boolean;
  created_at: string;
}

export function useSlotDetails(slotId: string | null) {
  const [slot, setSlot] = useState<ParkingSlotWithStatus | null>(null);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlotDetails = useCallback(async () => {
    if (!slotId) {
      setSlot(null);
      setSensorReadings([]);
      setLatestReading(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch slot with status
      const { data: slotData, error: slotError } = await supabase
        .from('parking_slots')
        .select(`
          *,
          slot_status (*)
        `)
        .eq('id', slotId)
        .single();

      if (slotError) throw slotError;
      setSlot(slotData);

      // Fetch recent sensor readings
      const { data: sensorData, error: sensorError } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('slot_id', slotId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sensorError) throw sensorError;
      setSensorReadings(sensorData || []);
      setLatestReading(sensorData?.[0] || null);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    fetchSlotDetails();

    if (!slotId) return;

    // Subscribe to sensor readings for this slot
    const channel = supabase
      .channel(`sensor_readings_${slotId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `slot_id=eq.${slotId}`,
        },
        (payload) => {
          const newReading = payload.new as SensorReading;
          setLatestReading(newReading);
          setSensorReadings((prev) => [newReading, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slotId, fetchSlotDetails]);

  return {
    slot,
    sensorReadings,
    latestReading,
    loading,
    error,
    refresh: fetchSlotDetails,
  };
}

// ============================================
// HOOK: useDeviceStatus
// Fetches Bluetooth/device status with real-time updates
// ============================================

export interface DeviceStatus {
  id: string;
  device_id: string;
  rssi: number | null;
  is_connected: boolean;
  last_ping: string | null;
  updated_at: string;
}

export function useDeviceStatus(deviceId: string = 'HC-05-MAIN') {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('device_status')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setStatus(data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchStatus();

    // Subscribe to device status changes
    const channel = supabase
      .channel('device_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_status',
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          console.log('Device status changed:', payload);
          if (payload.eventType === 'DELETE') {
            setStatus(null);
          } else {
            setStatus(payload.new as DeviceStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, fetchStatus]);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
  };
}

// ============================================
// HOOK: useDeviceCommands
// Send commands to device and track status
// ============================================

export interface DeviceCommand {
  id: string;
  slot_id: string;
  command_type: string;
  payload: Record<string, any>;
  status: 'pending' | 'sent' | 'executed' | 'failed';
  response: string | null;
  created_at: string;
  executed_at: string | null;
}

export function useDeviceCommands() {
  const [pending, setPending] = useState<DeviceCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send PING command (flicker LED 5 times)
  const sendPingCommand = async (slotId: string): Promise<DeviceCommand | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('device_commands')
        .insert([{
          slot_id: slotId,
          command_type: 'PING_LED_5X',
          payload: { flicker_count: 5 },
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Send DISABLE command
  const sendDisableCommand = async (slotId: string, disable: boolean): Promise<DeviceCommand | null> => {
    try {
      setLoading(true);
      
      // Insert command
      const { data: cmdData, error: cmdError } = await supabase
        .from('device_commands')
        .insert([{
          slot_id: slotId,
          command_type: disable ? 'DISABLE_SLOT' : 'ENABLE_SLOT',
          payload: { blink_indefinitely: disable },
          status: 'pending',
        }])
        .select()
        .single();

      if (cmdError) throw cmdError;

      // Also update the slot's is_disabled flag
      const { error: slotError } = await supabase
        .from('parking_slots')
        .update({ is_disabled: disable })
        .eq('id', slotId);

      if (slotError) throw slotError;

      // Update slot_status - clear occupied_since when disabling
      const { error: statusError } = await supabase
        .from('slot_status')
        .update({ 
          status: disable ? 'disabled' : 'vacant',
          occupied_since: null,  // Clear the timer
        })
        .eq('slot_id', slotId);

      if (statusError) throw statusError;

      return cmdData;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    pending,
    loading,
    error,
    sendPingCommand,
    sendDisableCommand,
  };
}

// ============================================
// HOOK: useBillingConfig
// Fetches billing configuration
// ============================================

export interface BillingConfigData {
  id: string;
  rate_per_hour: number;
  overtime_rate_per_hour: number;
  overtime_threshold_minutes: number;
  currency: string;
  updated_at: string;
}

export function useBillingConfig() {
  const [config, setConfig] = useState<BillingConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('billing_config')
          .select('*')
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setConfig(data || null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}
