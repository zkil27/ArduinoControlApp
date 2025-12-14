import { getProgressColor } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 1 (percentage of time used)
  isOvertime?: boolean;
  isVacant?: boolean;
  isDisabled?: boolean;
}

export function CircularProgress({
  size = 80,
  strokeWidth = 20,
  progress,
  isOvertime = false,
  isVacant = false,
  isDisabled = false,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;
  
  // Calculate percentage of time remaining (1 - progress)
  const percentRemaining = Math.max(0, 1 - progress);
  
  // Get color based on time remaining
  let progressColor: string;
  if (isDisabled || isVacant) {
    progressColor = '#444444';
  } else {
    progressColor = getProgressColor(percentRemaining, isOvertime);
  }
  
  // Calculate stroke dash offset for progress
  // Start from top and go clockwise
  const strokeDashoffset = circumference - (Math.min(progress, 1) * circumference);
  
  // Background track color - darker for the unfilled portion
  const trackColor = '#272727';
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress arc */}
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={isVacant ? circumference : strokeDashoffset}
            strokeLinecap="butt"
            fill="transparent"
          />
        </G>
        
        {/* Inner circle (donut hole) - matches card background */}
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2 - 4}
          fill="#0a0909"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CircularProgress;
