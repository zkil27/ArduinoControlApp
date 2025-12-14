# Supabase Integration

## Setup

1. Copy `.env.example` to `.env`
2. Add credentials from [Supabase Dashboard](https://app.supabase.com/project/_/settings/api)

## Usage

### Devices
```tsx
import { useDevices } from '@/hooks/use-devices';

const { devices, loading, addDevice, updateDevice, deleteDevice } = useDevices();
```

### Sensor Data (Real-time)
```tsx
import { useSensorData, useLatestSensorReading } from '@/hooks/use-sensor-data';

const { sensorData, addSensorData } = useSensorData(deviceId);
const { reading } = useLatestSensorReading(deviceId, 'temperature');
```

### Direct Client
```tsx
import { supabase } from '@/lib/supabase';

const { data } = await supabase.from('sensor_data').select('*');
```

All hooks include real-time subscriptions by default.
