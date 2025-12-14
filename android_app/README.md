# ParkSense Android App

Native Android version of the ParkSense parking management system.

## Setup Instructions

### 1. Add Supabase Credentials

Open `app/src/main/java/com/parksense/android/data/api/RetrofitClient.kt` and replace:

```kotlin
private const val SUPABASE_URL = "YOUR_SUPABASE_URL"
private const val SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"
```

With your actual Supabase credentials from the React Native `.env` file.

### 2. Build and Run

1. Open this folder (`android_app`) in Android Studio
2. Wait for Gradle sync to complete
3. Click "Run" or press Shift+F10
4. Select your device/emulator

## Features

- ✅ Real-time parking slot status display
- ✅ Grid layout (2 columns) matching web design
- ✅ Pull-to-refresh
- ✅ Auto-refresh every 5 seconds
- ✅ Dark theme matching ParkSense branding
- ✅ Timer display for occupied slots

## Architecture

- **MVVM-like pattern** (Repository → Activity)
- **Retrofit** for Supabase REST API calls
- **Coroutines** for async operations
- **RecyclerView** with GridLayoutManager for slot cards

## Database

Uses the **same Supabase database** as the React Native app, ensuring data synchronization between web and mobile platforms.
