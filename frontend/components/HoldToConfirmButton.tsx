import { FontFamily } from '@/constants/theme';
import React, { useCallback, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text
} from 'react-native';

interface HoldToConfirmButtonProps {
  label: string;
  holdDuration?: number; // in milliseconds
  onConfirm: () => void;
  disabled?: boolean;
  variant?: 'danger' | 'primary';
}

export function HoldToConfirmButton({
  label,
  holdDuration = 5000, // 5 seconds default
  onConfirm,
  disabled = false,
  variant = 'danger',
}: HoldToConfirmButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number>(0);
  const animationFrame = useRef<number | null>(null);
  
  const updateProgress = useCallback(() => {
    if (!isHolding) return;
    
    const elapsed = Date.now() - startTime.current;
    const newProgress = Math.min(elapsed / holdDuration, 1);
    setProgress(newProgress);
    
    if (newProgress < 1) {
      animationFrame.current = requestAnimationFrame(updateProgress);
    }
  }, [holdDuration, isHolding]);
  
  const handlePressIn = useCallback(() => {
    if (disabled) return;
    
    setIsHolding(true);
    startTime.current = Date.now();
    
    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: holdDuration,
      useNativeDriver: false,
    }).start();
    
    // Update progress state for visual feedback
    animationFrame.current = requestAnimationFrame(updateProgress);
    
    // Set timer for completion
    holdTimer.current = setTimeout(() => {
      setIsHolding(false);
      setProgress(0);
      progressAnim.setValue(0);
      onConfirm();
    }, holdDuration);
  }, [disabled, holdDuration, onConfirm, progressAnim, updateProgress]);
  
  const handlePressOut = useCallback(() => {
    // Cancel if released early
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    setIsHolding(false);
    setProgress(0);
  }, [progressAnim]);
  
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
    >
      {/* Progress overlay - red fill */}
      <Animated.View
        style={[
          styles.progressOverlay,
          {
            width: progressWidth,
          },
        ]}
      />
      
      <Text style={styles.label}>
        {isHolding ? `${Math.round(progress * 100)}%` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 103,
    height: 29,
    backgroundColor: '#272727',
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  disabled: {
    opacity: 0.5,
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ba2d2d',
  },
  label: {
    color: '#1e1e1e',
    fontFamily: FontFamily.mono,
    fontSize: 16,
    fontWeight: '400',
  },
});

export default HoldToConfirmButton;
