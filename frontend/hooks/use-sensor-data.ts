import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export interface SensorData {
  id: string;
  device_id: string;
  sensor_type: string;
  value: number;
  unit?: string;
  created_at: string;
}

/**
 * Hook to fetch sensor data for a device with real-time updates
 */
export function useSensorData(deviceId: string | null, limit: number = 100) {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setSensorData([]);
      setLoading(false);
      return;
    }

    fetchSensorData();

    // Subscribe to real-time sensor data
    const channel = supabase
      .channel(`sensor_data_${deviceId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'sensor_data',
          filter: `device_id=eq.${deviceId}`
        },
        (payload) => {
          console.log('New sensor data:', payload);
          setSensorData((prev) => [payload.new as SensorData, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, limit]);

  const fetchSensorData = async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setSensorData(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSensorData = async (
    data: Omit<SensorData, 'id' | 'created_at'>
  ) => {
    try {
      const { data: newData, error } = await supabase
        .from('sensor_data')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return { data: newData, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  };

  return {
    sensorData,
    loading,
    error,
    addSensorData,
    refresh: fetchSensorData,
  };
}

/**
 * Hook to get the latest sensor reading by type
 */
export function useLatestSensorReading(
  deviceId: string | null,
  sensorType: string
) {
  const [reading, setReading] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setReading(null);
      setLoading(false);
      return;
    }

    fetchLatestReading();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`sensor_${deviceId}_${sensorType}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data',
          filter: `device_id=eq.${deviceId}`
        },
        (payload) => {
          const newData = payload.new as SensorData;
          if (newData.sensor_type === sensorType) {
            setReading(newData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, sensorType]);

  const fetchLatestReading = async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('device_id', deviceId)
        .eq('sensor_type', sensorType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      setReading(data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { reading, loading, error, refresh: fetchLatestReading };
}
