import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export interface Device {
  id: string;
  user_id: string;
  name: string;
  type: string;
  mac_address?: string;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch all devices for the current user
 */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('devices_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload) => {
          console.log('Device change:', payload);
          fetchDevices(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async (device: Omit<Device, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .insert([device])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  };

  const updateDevice = async (id: string, updates: Partial<Device>) => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return {
    devices,
    loading,
    error,
    addDevice,
    updateDevice,
    deleteDevice,
    refresh: fetchDevices,
  };
}

/**
 * Hook to fetch a single device by ID
 */
export function useDevice(deviceId: string | null) {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setDevice(null);
      setLoading(false);
      return;
    }

    fetchDevice();

    // Subscribe to real-time changes for this device
    const channel = supabase
      .channel(`device_${deviceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices', filter: `id=eq.${deviceId}` },
        (payload) => {
          console.log('Device updated:', payload);
          if (payload.eventType === 'DELETE') {
            setDevice(null);
          } else {
            setDevice(payload.new as Device);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  const fetchDevice = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', deviceId)
        .single();

      if (error) throw error;
      setDevice(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { device, loading, error, refresh: fetchDevice };
}
