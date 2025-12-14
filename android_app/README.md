# ParkSense Android

Native Android app for the ParkSense parking system.

## Setup

1. Open `android_app` in Android Studio
2. Add Supabase credentials in `RetrofitClient.kt`:
   ```kotlin
   private const val SUPABASE_URL = "YOUR_URL"
   private const val SUPABASE_ANON_KEY = "YOUR_KEY"
   ```
3. Run → Select device → Build

## Features

- Real-time slot status
- Pull-to-refresh + auto-refresh (5s)
- Occupancy timers
- Dark theme

## Architecture

- **Pattern**: Repository → ViewModel → Fragment
- **Network**: Retrofit + Coroutines
- **UI**: RecyclerView + GridLayoutManager
- **Database**: Shared Supabase instance
