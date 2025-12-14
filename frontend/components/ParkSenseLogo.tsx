import { Colors, FontFamily, FontSizes } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ParkSenseLogoProps {
  size?: 'small' | 'medium' | 'large';
}

export function ParkSenseLogo({ size = 'large' }: ParkSenseLogoProps) {
  const fontSize = size === 'large' ? FontSizes.logo : size === 'medium' ? FontSizes.xxl : FontSizes.lg;
  
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { fontSize }]}>
        <Text style={styles.park}>Park</Text>
        <Text style={styles.s}>S</Text>
        <Text style={styles.e}>e</Text>
        <Text style={styles.nse}>ns</Text>
        <Text style={styles.e}>e</Text>
        <Text style={styles.dot}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: FontFamily.mono,
    fontWeight: '400',
  },
  park: {
    color: Colors.textPrimary,
  },
  s: {
    color: Colors.accentBlue,
  },
  e: {
    color: Colors.accentPink,
  },
  nse: {
    color: Colors.accentGreen,
  },
  dot: {
    color: Colors.accentGreen,
  },
});

export default ParkSenseLogo;
