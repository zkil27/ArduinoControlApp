import { getProgressColor } from '@/constants/theme';
import React, { useMemo } from 'react';
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

export const CircularProgress = React.memo(function CircularProgress({
  size = 80,
  strokeWidth = 20,
  progress,
  isOvertime = false,
  isVacant = false,
  isDisabled = false,
}: CircularProgressProps) {
  // Memoize all calculations
  const calculations = useMemo(() => {
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
    // Updated Logic: User wants it to START FILLED and DRAIN.
    // So visual progress = 1 - progress.
    // If Overtime: Ensure it is FULL (active).
    
    // Clamp progress to 0-1 for calculation
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    
    // Visual Fill:
    // If Overtime: 1 (Full)
    // Else: 1 - progress (Starts at 1, goes to 0)
    const visualFill = isOvertime ? 1 : (1 - clampedProgress);
    
    // Start from top and go clockwise (Standard SVG)
    // Offset = Circumference * (1 - VisualFill)
    const strokeDashoffset = circumference - (visualFill * circumference);
    
    // Background track color - darker for the unfilled portion
    const trackColor = '#272727';
    
    return {
      radius,
      circumference,
      center,
      progressColor,
      strokeDashoffset,
      trackColor,
    };
  }, [size, strokeWidth, progress, isOvertime, isVacant, isDisabled]);
  
  return (
    <View style={[styles.container, { width: size, height: size, transform: [{ scaleX: -1 }] }]}>
      <Svg width={size} height={size}>
        {/* Background track circle */}
        <Circle
          cx={calculations.center}
          cy={calculations.center}
          r={calculations.radius}
          stroke={calculations.trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress arc */}
        <G rotation="-90" origin={`${calculations.center}, ${calculations.center}`}>
          <Circle
            cx={calculations.center}
            cy={calculations.center}
            r={calculations.radius}
            stroke={calculations.progressColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${calculations.circumference} ${calculations.circumference}`}
            strokeDashoffset={(isVacant || isDisabled) ? calculations.circumference : calculations.strokeDashoffset}
            strokeLinecap="butt"
            fill="transparent"
          />
        </G>
        
        {/* Inner circle (donut hole) - matches card background */}
        <Circle
          cx={calculations.center}
          cy={calculations.center}
          r={calculations.radius - strokeWidth / 2 - 4}
          fill="#0a0909"
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CircularProgress;

