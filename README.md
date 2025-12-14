# ParkSense 

Smart parking management system with real-time slot monitoring.

## Tech Stack

- **Frontend**: React Native (Expo) + Native Android (Kotlin)
- **Backend**: Supabase (serverless)
- **Hardware**: Arduino + IR sensors + Bluetooth

## Quick Start

### React Native
```bash
cd frontend
npm install
npm run android  # or npm run ios
```

### Native Android
1. Open `android_app` in Android Studio
2. Add Supabase credentials in `RetrofitClient.kt`
3. Run the app

### Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in SQL Editor
3. Copy credentials to `frontend/.env`

## Project Structure

```
├── frontend/          # React Native (Expo)
├── android_app/       # Native Android (Kotlin)
├── supabase/          # Database schema
└── .github/workflows/ # CI/CD (Vercel deploy)
```

## Features

- ✅ Real-time parking slot status
- ✅ Bluetooth Arduino integration
- ✅ Pull-to-refresh & auto-refresh
- ✅ Occupancy timers
- ✅ Dark theme

## Docs

- [Supabase Setup Guide](SUPABASE_SETUP_GUIDE.md)
- [Android App README](android_app/README.md)
- [Frontend Supabase Guide](frontend/SUPABASE.md)
