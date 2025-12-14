# Arduino Control App 🤖⚡

A **100% serverless** React Native app for controlling Arduino devices via Bluetooth. Built with Expo and Supabase - no backend server required!

## ✨ Key Features

- 🔌 **Direct Bluetooth control** of Arduino devices
- ⚡ **Serverless architecture** - No backend to manage
- 🔄 **Real-time data sync** - Sensor readings update instantly
- 🔒 **Built-in authentication** - Secure user data with Row Level Security
- 📊 **Auto-scaling database** - Powered by Supabase
- 🚀 **Native performance** - Expo Development Build

## 🚀 Prerequisites

- **Node.js** (v18 or higher)
- **Android Studio** (for Android) or **Xcode** (for iOS - Mac only)
- **Android/iOS device or emulator** with Bluetooth
- **Arduino board** with Bluetooth module (HC-05, HC-06, or BLE)
- **Supabase account** (free tier available at [supabase.com](https://supabase.com))

## 📦 Installation

### Frontend (React Native App)

1. Navigate to frontend folder and install dependencies

   ```bash
   cd frontend
   npm install
   ```

2. Build the development app (first time only)

   **For Android:**

   ```bash
   npm run android
   ```

   **For iOS (Mac only):**

   ```bash
   npm run ios
   ```

   > **Note:** The first build takes 5-10 minutes. This installs a custom development build on your device with native Bluetooth support.

3. Start the development server

   ```bash
   npm start
   ```

   Then press `a` for Android or `i` for iOS to launch the app.

### Serverless Backend (Supabase) ⚡

This project uses **Supabase** for a fully serverless backend - your React Native app connects directly to the database!

#### 1. Create Supabase Project

- Go to [supabase.com](https://supabase.com) and create a new project
- Wait 2-3 minutes for project initialization

#### 2. Setup Database

- Open Supabase SQL Editor: https://app.supabase.com/project/_/sql
- Copy contents of [`supabase/schema.sql`](supabase/schema.sql)
- Paste and click **Run** to create tables

#### 3. Get API Credentials

- Go to Project Settings → API: https://app.supabase.com/project/_/settings/api
- Copy your **Project URL** and **anon/public key**

#### 4. Configure Frontend

```bash
cd frontend
cp .env.example .env
```

Edit [`frontend/.env`](frontend/.env) and add your credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 5. Start Coding! 🎉

The app is ready with real-time hooks. See [`frontend/SUPABASE.md`](frontend/SUPABASE.md) for examples.

## 🏗️ Project Structure

```
ArduinoControlApp/
├── frontend/                      # React Native mobile app (Expo)
│   ├── app/                       # Screens & navigation (Expo Router)
│   │   ├── (tabs)/                # Tab-based navigation
│   │   ├── _layout.tsx            # Root layout
│   │   └── modal.tsx              # Modal screens
│   ├── components/                # Reusable UI components
│   ├── hooks/                     # 🔥 Custom React hooks
│   │   ├── use-devices.ts         # Device CRUD with real-time sync
│   │   └── use-sensor-data.ts     # Sensor logging with live updates
│   ├── lib/
│   │   └── supabase.ts            # Supabase client configuration
│   ├── constants/                 # App-wide constants
│   ├── assets/                    # Images and resources
│   ├── .env                       # Your Supabase credentials (gitignored)
│   └── package.json
│
├── supabase/                      # Serverless backend configuration
│   ├── schema.sql                 # Database schema (PostgreSQL)
│   ├── config.toml                # Local Supabase CLI config
│   └── SETUP.md                   # Detailed setup guide
│
└── README.md
```

## Why This Stack?

### Expo Development Build (not Expo Go)

- ✅ Native Bluetooth support for Arduino control
- ✅ Custom native modules when needed
- ✅ Full device capabilities
- ✅ Fast refresh development experience

### Supabase (Serverless Backend)

- ✅ **Zero servers to manage** - No Express, no hosting, no DevOps
- ✅ **Real-time by default** - Sensor data updates instantly across devices
- ✅ **Built-in authentication** - User management included
- ✅ **Row Level Security** - Database-level access control
- ✅ **Auto-scaling** - Handles 1 or 1 million users
- ✅ **Generous free tier** - Up to 500MB database, 2GB file storage
- ✅ **PostgreSQL** - Full SQL database, not a NoSQL compromise

```text
│  React Native App   │  ← Your frontend (mobile app)
│  (Expo Dev Build)   │
└──────────┬──────────┘
           │ Direct Connection
           │ (REST API + WebSocket)
           ↓
┌─────────────────────┐
│    Supabase Cloud   │  ← Serverless backend
├─────────────────────┤
│  PostgreSQL DB      │  ← Auto-scaling database
│  Authentication     │  ← Built-in auth
│  Real-time Engine   │  ← Live data sync
│  Row Level Security │  ← Data protection
└─────────────────────┘
```

**No servers to manage. No deployment. Just code and scale!** 🚀

## 🎯 Development Build vs Expo Go

This app uses **Expo Development Build** instead of Expo Go because:

- ✅ Supports native Bluetooth libraries
- ✅ Can add custom native modules
- ✅ Full access to device capabilities
- ✅ Still maintains fast refresh and Expo development experience

## 🔧 Available Scripts

### Frontend

- `cd frontend && npm start` - Start the development server with dev client
- `cd frontend && npm run android` - Build and run on Android
- `cd frontend && npm run ios` - Build and run on iOS
- `cd frontend && npm run web` - Run on web browser
- `cd frontend && npm run lint` - Run ESLint

## 💡 Usage Examples

### Managing Devices

```tsx
import { useDevices } from "@/hooks/use-devices";

function MyComponent() {
  const { devices, loading, addDevice } = useDevices();

  const createDevice = async () => {
    await addDevice({
      name: "Arduino Uno",
      type: "arduino_uno",
      mac_address: "00:11:22:33:44:55",
      is_online: true,
    });
  };

  return <View>{/* Your UI */}</View>;
}
```

### Real-time Sensor Data

```tsx
import { useSensorData } from "@/hooks/use-sensor-data";

function SensorDashboard({ deviceId }: { deviceId: string }) {
  const { sensorData, addSensorData } = useSensorData(deviceId);

  const logTemperature = async (temp: number) => {
    await addSensorData({
      device_id: deviceId,
      sensor_type: "temperature",
      value: temp,
      unit: "C",
    });
  };

  // UI automatically updates when new sensor data arrives!
  return <View>{/* Display sensor data */}</View>;
}
```

📚 **More examples:** See [`frontend/SUPABASE.md`](frontend/SUPABASE.md)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
