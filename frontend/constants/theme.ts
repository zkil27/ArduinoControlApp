/**
 * ParkSense Theme Configuration
 * Colors from the design mockup - Azeret Mono font
 */

import { Platform } from 'react-native';

// ============================================
// PARKSENSE COLOR PALETTE
// ============================================
export const Colors = {
  // Backgrounds
  background: '#121212',
  backgroundDark: '#000000',
  cardBackground: '#121111',
  cardBackgroundLight: '#121212',
  
  // Text
  textPrimary: '#EDEDED',
  textSecondary: '#444444',
  textMuted: '#272727',
  
  // Status Colors
  statusOccupied: '#42BC2B',      // Green - lots of time
  statusEnoughTime: '#1F4FCE',    // Blue - enough time
  statusWarning: '#C3257A',       // Pink/Magenta - close to overtime
  statusOvertime: '#BA2D2D',      // Red - overtime
  statusVacant: '#444444',        // Gray - vacant
  statusDisabled: '#272727',      // Dark gray - disabled
  
  // Progress Ring Colors (based on time remaining)
  progressGreen: '#42BC2B',       // > 60% time remaining
  progressBlue: '#1F4FCE',        // 30-60% time remaining
  progressPink: '#C3257A',        // 10-30% time remaining
  progressRed: '#BA2D2D',         // < 10% or overtime
  
  // Accent Colors
  accentBlue: '#1F4FCE',
  accentPink: '#C3257A',
  accentGreen: '#42BC2B',
  accentYellow: '#BEC91F',
  
  // UI Elements
  border: '#272727',
  buttonPrimary: '#1F4FCE',
  buttonDanger: '#BA2D2D',
  buttonSecondary: '#272727',
  
  // Bluetooth Status Colors
  bluetoothStrong: '#42BC2B',       // Green
  bluetoothWeak: '#BEC91F',         // Yellow
  bluetoothNoConnection: '#BA2D2D', // Red
  bluetoothDisconnected: '#444444', // Gray
  
  // Aliases for convenience
  primary: '#42BC2B',
  secondary: '#1F4FCE',
  danger: '#BA2D2D',
  warning: '#BEC91F',
  card: '#121111',
  text: '#EDEDED',
  occupied: '#42BC2B',
  overtime: '#BA2D2D',
  vacant: '#444444',
  
  // Legacy support (light/dark mode)
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#EDEDED',
    background: '#0A0909',
    tint: '#fff',
    icon: '#444444',
    tabIconDefault: '#444444',
    tabIconSelected: '#fff',
  },
};

// ============================================
// FONTS - Azeret Mono
// ============================================
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'Azeret Mono',
  },
  android: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'AzeretMono',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: "'Azeret Mono', monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "'Azeret Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Easy access to mono font family
export const FontFamily = {
  mono: Platform.select({
    ios: 'AzeretMono',
    android: 'AzeretMono', 
    default: 'AzeretMono',
    web: 'AzeretMono',
  }) ?? 'AzeretMono',
};

// ============================================
// FONT SIZES
// ============================================
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 36,
  logo: 44,
};

// ============================================
// SPACING
// ============================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ============================================
// BORDER RADIUS
// ============================================
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

// ============================================
// BILLING CONFIGURATION
// ============================================
export const BillingConfig = {
  ratePerHour: 25,              // PHP 25/hr
  overtimeRatePerHour: 100,     // PHP 100/hr after overtime
  overtimeThresholdMinutes: 180, // 3 hours
  currency: '₱',
  currencyCode: 'PHP',
};

// ============================================
// BLUETOOTH RSSI THRESHOLDS
// ============================================
export const BluetoothThresholds = {
  strong: -60,        // RSSI > -60 = Strong Connection
  weak: -80,          // -60 to -80 = Weak Connection
  noConnection: -100, // < -80 = No Connection
};

// ============================================
// PROGRESS RING COLOR THRESHOLDS
// (percentage of allowed time remaining)
// ============================================
export const ProgressColorThresholds = {
  green: 0.5,   // > 50% remaining
  blue: 0.15,   // 15-50% remaining
  pink: 0,      // 0-15% remaining
  // < 0% or overtime = red
};

// Helper function to get progress color based on time remaining
export function getProgressColor(percentRemaining: number, isOvertime: boolean): string {
  if (isOvertime || percentRemaining <= 0) {
    return Colors.progressRed;
  }
  if (percentRemaining > ProgressColorThresholds.green) {
    return Colors.progressGreen;
  }
  if (percentRemaining > ProgressColorThresholds.blue) {
    return Colors.progressBlue;
  }
  if (percentRemaining > ProgressColorThresholds.pink) {
    return Colors.progressPink;
  }
  return Colors.progressRed;
}

// Helper function to get Bluetooth status label
export function getBluetoothStatus(rssi: number | null, isConnected: boolean): {
  label: string;
  color: string;
} {
  if (!isConnected || rssi === null) {
    return { label: 'Disconnected', color: Colors.bluetoothDisconnected };
  }
  if (rssi > BluetoothThresholds.strong) {
    return { label: 'Strong Connection', color: Colors.bluetoothStrong };
  }
  if (rssi > BluetoothThresholds.weak) {
    return { label: 'Weak Connection', color: Colors.bluetoothWeak };
  }
  return { label: 'No Connection', color: Colors.bluetoothNoConnection };
}

// Helper function to calculate billing
export function calculateBilling(occupiedSince: Date | null): {
  amount: number;
  isOvertime: boolean;
  minutesParked: number;
} {
  if (!occupiedSince) {
    return { amount: 0, isOvertime: false, minutesParked: 0 };
  }
  
  const now = new Date();
  const minutesParked = Math.floor((now.getTime() - occupiedSince.getTime()) / 60000);
  const isOvertime = minutesParked > BillingConfig.overtimeThresholdMinutes;
  
  let amount: number;
  if (!isOvertime) {
    amount = (minutesParked / 60) * BillingConfig.ratePerHour;
  } else {
    const regularMinutes = BillingConfig.overtimeThresholdMinutes;
    const overtimeMinutes = minutesParked - BillingConfig.overtimeThresholdMinutes;
    amount = (regularMinutes / 60) * BillingConfig.ratePerHour 
           + (overtimeMinutes / 60) * BillingConfig.overtimeRatePerHour;
  }
  
  return {
    amount: Math.round(amount * 100) / 100,
    isOvertime,
    minutesParked,
  };
}

export default {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
  BillingConfig,
  BluetoothThresholds,
  ProgressColorThresholds,
};
