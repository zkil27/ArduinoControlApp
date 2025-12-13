# Supabase Integration - Usage Examples

## Setup

1. Copy `.env.example` to `.env`
2. Add your Supabase credentials from: https://app.supabase.com/project/_/settings/api

## Using Devices

```tsx
import { useDevices } from '@/hooks/use-devices';

function DeviceList() {
  const { devices, loading, addDevice, updateDevice, deleteDevice } = useDevices();

  if (loading) return <Text>Loading...</Text>;

  return (
    <View>
      {devices.map((device) => (
        <Text key={device.id}>{device.name}</Text>
      ))}
    </View>
  );
}
```

## Using Sensor Data (with Real-time Updates!)

```tsx
import { useSensorData, useLatestSensorReading } from '@/hooks/use-sensor-data';

function SensorDashboard({ deviceId }: { deviceId: string }) {
  // Get all sensor readings
  const { sensorData, addSensorData } = useSensorData(deviceId, 50);

  // Or get just the latest temperature reading
  const { reading: tempReading } = useLatestSensorReading(deviceId, 'temperature');

  // Log new sensor data
  const logTemperature = async () => {
    await addSensorData({
      device_id: deviceId,
      sensor_type: 'temperature',
      value: 25.5,
      unit: 'C'
    });
  };

  return (
    <View>
      <Text>Current Temperature: {tempReading?.value}°C</Text>
    </View>
  );
}
```

## Direct Supabase Client

For custom queries, use the client directly:

```tsx
import { supabase } from '@/lib/supabase';

// Custom query
const { data } = await supabase
  .from('sensor_data')
  .select('*')
  .eq('sensor_type', 'temperature')
  .gte('value', 25)
  .order('created_at', { ascending: false });
```

## Real-time Subscriptions

All hooks include real-time subscriptions by default! Changes in the database automatically update your UI.
