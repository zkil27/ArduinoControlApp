import { FontFamily } from '@/constants/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircularProgress } from './CircularProgress';

export type SlotStatus = 'occupied' | 'overtime' | 'vacant' | 'disabled' | 'add';

interface SlotCardProps {
  slotId: string;
  slotName: string;
  status: SlotStatus;
  occupiedSince: string | null; // Changed from elapsedMinutes
  allowedMinutes: number;
  onPress?: (slotId: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 30) / 2; // 10px padding on each side + 10px gap
const isWeb = Platform.OS === 'web';

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes * 60) % 60);
  return `${hours.toString().padStart(2, '0')}h:${mins.toString().padStart(2, '0')}m:${secs.toString().padStart(2, '0')}s`;
}

// Memoized component with custom comparison
export const SlotCard = React.memo(function SlotCard({
  slotId,
  slotName,
  status,
  occupiedSince,
  allowedMinutes,
  onPress,
}: SlotCardProps) {
  // Calculate initial elapsed time from occupiedSince
  const getElapsedMinutes = () => {
    if (!occupiedSince || (status !== 'occupied' && status !== 'overtime')) {
      return 0;
    }
    return Math.floor((Date.now() - new Date(occupiedSince).getTime()) / (1000 * 60));
  };

  const [duration, setDuration] = useState(getElapsedMinutes());
  
  // Update duration every second with internal counter
  useEffect(() => {
    setDuration(getElapsedMinutes());
    
    if (status === 'vacant' || status === 'add' || status === 'disabled') {
      return;
    }
    
    // Increment every second
    const interval = setInterval(() => {
      setDuration(prev => prev + (1/60)); // Add 1 second as fraction of minute
    }, 1000);
    
    return () => clearInterval(interval);
  }, [occupiedSince, status]); // Changed from elapsedMinutes
  
  // Memoize expensive calculations
  const statusInfo = useMemo(() => {
    const getStatusLabel = (): string => {
      switch (status) {
        case 'occupied': return 'OCCUPIED';
        case 'overtime': return 'OVERTIME';
        case 'vacant': return 'VACANT';
        case 'disabled': return 'DISABLED';
        case 'add': return 'ADD PARK';
        default: return '';
      }
    };
    
    const getStatusColor = (): string => {
      switch (status) {
        case 'occupied': return '#42bc2b'; // Green
        case 'overtime': return '#ba2d2d'; // Red
        case 'vacant': return '#444444';   // Gray
        case 'disabled': return '#d1d1d1ff';
        case 'add': return '#444444';
        default: return '#444444';
      }
    };

    const getDurationColor = (): string => {
      if (status === 'vacant' || status === 'add' || status === 'disabled') {
        return '#444444';
      }
      return '#ededed';
    };

    const getSlotNameColor = (): string => {
      if (status === 'vacant' || status === 'add' || status === 'disabled') {
        return '#444444';
      }
      return '#ededed';
    };

    const getBorderColor = (): string => {
      if (status === 'disabled') {
        return '#ba2d2d'; // Red for disabled
      }
      return '#272727'; // Default border color
    };
    
    return {
      label: getStatusLabel(),
      color: getStatusColor(),
      durationColor: getDurationColor(),
      nameColor: getSlotNameColor(),
      borderColor: getBorderColor(),
    };
  }, [status]);
  
  const progress = useMemo(() => {
    return allowedMinutes > 0 ? Math.min(duration / allowedMinutes, 1) : 0;
  }, [duration, allowedMinutes]);
  
  const handlePress = () => {
    onPress?.(slotId);
  };

  // Calculate display time: Elapsed Time (Counting Up)
  const displayTime = formatDuration(duration);
  
  return (
    <TouchableOpacity 
      style={[styles.card, { borderColor: statusInfo.borderColor }]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
        {statusInfo.label}
      </Text>
      
      <View style={styles.progressContainer}>
        <CircularProgress
          size={80}
          progress={progress}
          isOvertime={status === 'overtime'}
          isVacant={status === 'vacant'}
          isDisabled={status === 'disabled'}
        />
      </View>
      
      <Text style={[styles.duration, { color: statusInfo.durationColor }]}>
        {displayTime}
      </Text>
      
      <Text style={[styles.slotName, { color: statusInfo.nameColor }]}>{slotName}</Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these props change
  return (
    prevProps.status === nextProps.status &&
    prevProps.slotName === nextProps.slotName &&
    prevProps.allowedMinutes === nextProps.allowedMinutes &&
    prevProps.occupiedSince === nextProps.occupiedSince && // Changed from elapsedMinutes
    prevProps.onPress === nextProps.onPress
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0909',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#272727',
    width: isWeb ? 180 : cardWidth,
    height: 237,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  slotName: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },
  statusLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 2,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  duration: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default SlotCard;

