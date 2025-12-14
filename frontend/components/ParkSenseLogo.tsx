import { Colors, FontFamily, FontSizes } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ParkSenseLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
}

export function ParkSenseLogo({ size = 'large', showTagline = false }: ParkSenseLogoProps) {
  const fontSize = size === 'large' ? FontSizes.logo : size === 'medium' ? FontSizes.xxl : FontSizes.lg;
  
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { fontSize }]}>
        <Text style={styles.park}>Park</Text>
        <Text style={styles.sBlue}>S</Text>
        <Text style={styles.eGreen}>e</Text>
        <Text style={styles.nPink}>n</Text>
        <Text style={styles.sWhite}>s</Text>
        <Text style={styles.eWhite}>e</Text>
        <Text style={styles.dotGreen}>.</Text>
      </Text>
      
      {showTagline && (
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>
            ParkSense IoT Monitoring Application Built for
          </Text>
          <Text style={styles.tagline}>
            Philippine Christian University Final Project
          </Text>
          <Text style={styles.taglineCreators}>
            Created by Escueta, Tamayo, and Catacutan
          </Text>
        </View>
      )}
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
    color: Colors.textPrimary, // White
  },
  sBlue: {
    color: Colors.accentBlue, // Blue #1F4FCE
  },
  eGreen: {
    color: Colors.accentGreen, // Green #42BC2B
  },
  nPink: {
    color: Colors.accentPink, // Pink/Magenta #C3257A
  },
  sWhite: {
    color: Colors.textPrimary, // White
  },
  eWhite: {
    color: Colors.textPrimary, // White
  },
  dotGreen: {
    color: Colors.accentGreen, // Green #42BC2B
  },
  taglineContainer: {
    marginTop: 120,
    alignItems: 'center',
  },
  tagline: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  taglineCreators: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
  },
});

export default ParkSenseLogo;
