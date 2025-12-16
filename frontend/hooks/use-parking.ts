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

// Global cache to persist data across navigation
let globalSlotsCache: ParkingSlotWithStatus[] = [];
let globalHasLoaded = false;

export function useParkingSlots() {
  const [slots, setSlots] = useState<ParkingSlotWithStatus[]>(globalSlotsCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(!globalHasLoaded);

  const fetchSlots = useCallback(async () => {
    // Only show loading if we haven't loaded before
    const loadingTimer = setTimeout(() => {
      if (isInitialLoad) setLoading(true);
    }, 200);

    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select(`
          *,
          slot_status (*)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      
      const newSlots = data || [];
      setSlots(newSlots);
      
      // Update cache
      globalSlotsCache = newSlots;
      globalHasLoaded = true;
      setIsInitialLoad(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      // Clear the timer - if request finished fast, loading never set to true
      clearTimeout(loadingTimer);
      setLoading(false);
    }
  }, [isInitialLoad]);

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
    addVirtualSlot: async (initialStatus: 'vacant' | 'occupied') => {
      try {
        // 1. Create slot
        const { data: slot, error: slotError } = await supabase
          .from('parking_slots')
          .insert({
            name: `P${slots.length + 1}`, // Simple naming increment
            allowed_minutes: 60,
            is_placeholder: false,
            is_disabled: false
          })
          .select()
          .single();

        if (slotError) throw slotError;

        // 2. Create status
        if (slot) {
          const { error: statusError } = await supabase
            .from('slot_status')
            .insert({
              slot_id: slot.id,
              status: initialStatus,
              occupied_since: initialStatus === 'occupied' ? new Date().toISOString() : null
            });
            
          if (statusError) throw statusError;
        }
        
        // Refresh to update UI
        await fetchSlots();
        return { success: true };
      } catch (err: any) {
        console.error('Error adding slot:', err);
        return { success: false, error: err.message };
      }
    },
    removeLastSlot: async () => {
      try {
        if (slots.length === 0) return { success: false, error: 'No slots to remove' };
        
        // Find the most recently created slot (assuming order by creation or just last in list)
        // Since we order by name in fetch, let's find the one with highest 'P' number or just last
        // Better: Query DB for latest created
        const { data: latestSlot, error: fetchError } = await supabase
          .from('parking_slots')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (fetchError) throw fetchError;
        
        if (latestSlot) {
          const { error: deleteError } = await supabase
            .from('parking_slots')
            .delete()
            .eq('id', latestSlot.id);
            
          if (deleteError) throw deleteError;
        }
        
        await fetchSlots();
        return { success: true };
      } catch (err: any) {
        console.error('Error removing slot:', err);
        return { success: false, error: err.message };
      }
    },
    resetParkingSlots: async () => {
      try {
        // 1. Fetch ALL slots ordered by creation
        const { data: allSlots, error: fetchError } = await supabase
          .from('parking_slots')
          .select('id')
          .order('created_at', { ascending: true }); // Oldest first
          
        if (fetchError) throw fetchError;
        if (!allSlots || allSlots.length <= 5) return { success: true }; // Nothing to delete
        
        // 2. Identify slots to delete (skip first 5)
        const slotsToDelete = allSlots.slice(5).map(s => s.id);
        
        if (slotsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('parking_slots')
            .delete()
            .in('id', slotsToDelete);
            
          if (deleteError) throw deleteError;
        }
        
        await fetchSlots();
        return { success: true };
      } catch (err: any) {
        console.error('Error resetting slots:', err);
        return { success: false, error: err.message };
      }
    },
    simulateTraffic: async () => {
      try {
        if (slots.length === 0) return { success: false, error: 'No slots available' };
        
        // Pick a random slot
        const randomSlot = slots[Math.floor(Math.random() * slots.length)];
        const currentStatus = randomSlot.slot_status?.status || 'vacant';
        const newStatus = currentStatus === 'vacant' ? 'occupied' : 'vacant';
        
        // Update database
        const { error: updateError } = await supabase
          .from('slot_status')
          .upsert({
            slot_id: randomSlot.id,
            status: newStatus,
            occupied_since: newStatus === 'occupied' ? new Date().toISOString() : null
          }, { onConflict: 'slot_id' });
          
        if (updateError) throw updateError;
        
        // No need to fetchSlots() manually as subscription will handle it
        return { success: true, slotName: randomSlot.name, newStatus };
      } catch (err: any) {
        console.error('Error simulating traffic:', err);
        return { success: false, error: err.message };
      }
    },
    
    vacateAllSlots: async () => {
      try {
        // Bulk update all non-vacant slots to vacant
        const { error } = await supabase
          .from('slot_status')
          .update({ status: 'vacant', occupied_since: null })
          .neq('status', 'vacant'); // Only update occupied/overtime slots
          
        if (error) throw error;
        
        // Subscription will handle refresh, but we can force it
        await fetchSlots();
        return { success: true };
      } catch (err: any) {
        console.error('Error clearing all slots:', err);
        return { success: false, error: err.message };
      }
    },

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
      console.log(`[sendDisableCommand] Starting - slotId: ${slotId}, disable: ${disable}`);
      
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

      if (cmdError) {
        console.error('[sendDisableCommand] Command insert error:', cmdError);
        throw cmdError;
      }
      console.log('[sendDisableCommand] Command inserted:', cmdData);

      // Also update the slot's is_disabled flag
      const { data: slotData, error: slotError } = await supabase
        .from('parking_slots')
        .update({ is_disabled: disable })
        .eq('id', slotId)
        .select();

      if (slotError) {
        console.error('[sendDisableCommand] Slot update error:', slotError);
        throw slotError;
      }
      console.log('[sendDisableCommand] Slot updated:', slotData);

      // Try to update slot_status first
      const { data: updateData, error: updateError } = await supabase
        .from('slot_status')
        .update({ 
          status: disable ? 'disabled' : 'vacant',
          occupied_since: null,
        })
        .eq('slot_id', slotId)
        .select();

      console.log('[sendDisableCommand] Update result:', updateData, updateError);

      // If no rows were updated (empty array), insert a new record
      if (!updateData || updateData.length === 0) {
        console.log('[sendDisableCommand] No slot_status record found, inserting new one');
        const { data: insertData, error: insertError } = await supabase
          .from('slot_status')
          .insert({ 
            slot_id: slotId,
            status: disable ? 'disabled' : 'vacant',
            occupied_since: null,
          })
          .select();

        if (insertError) {
          console.error('[sendDisableCommand] Status insert error:', insertError);
          throw insertError;
        }
        console.log('[sendDisableCommand] Status inserted:', insertData);
      } else {
        console.log('[sendDisableCommand] Status updated:', updateData);
      }

      return cmdData;
    } catch (err: any) {
      console.error('[sendDisableCommand] Error:', err);
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
