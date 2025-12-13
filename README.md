# Arduino Control App 🤖

A React Native app built with Expo for controlling Arduino devices via Bluetooth. This project uses Expo's development build to support native Bluetooth capabilities.

## 🚀 Prerequisites

- **Node.js** (v18 or higher)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - Mac only)
- **Android device or emulator** with Bluetooth
- **Arduino board** with Bluetooth module (HC-05, HC-06, or BLE)

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

### Backend (Node.js Server)

1. Navigate to backend folder and install dependencies

   ```bash
   cd backend
   npm install
   ```

2. Start the server

   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
ArduinoControlApp/
├── frontend/                 # React Native mobile app
│   ├── app/                  # Screens and navigation (Expo Router)
│   │   ├── (tabs)/           # Tab-based navigation screens
│   │   ├── _layout.tsx       # Root layout with theme provider
│   │   └── modal.tsx         # Example modal screen
│   ├── components/           # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── constants/            # App-wide constants (colors, themes)
│   ├── assets/               # Images and static resources
│   ├── android/              # Native Android code (auto-generated)
│   └── package.json          # Frontend dependencies
│
├── backend/                  # Node.js backend server
│   ├── src/
│   │   └── index.js          # Server entry point
│   └── package.json          # Backend dependencies
│
└── README.md
```

## 🎯 Development Build vs Expo Go

This app uses **Expo Development Build** instead of Expo Go because:
- ✅ Supports native Bluetooth libraries
- ✅ Can add custom native modules
- ✅ Full access to device capabilities
- ✅ Still maintains fast refresh and Expo development experience

## 🔧 Available Scripts

- `npm start` - Start the development server with dev client
- `npm run android` - Build and run on Android
- `npm run ios` - Build and run on iOS
- `npm run web` - Run on web browser
- `npm run lint` - Run ESLint
- `npm run reset-project` - Reset to blank template

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
