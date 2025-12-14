import { FontFamily } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircularProgress } from './CircularProgress';

export type SlotStatus = 'occupied' | 'overtime' | 'vacant' | 'disabled' | 'add';

interface SlotCardProps {
  slotId: string;
  slotName: string;
  status: SlotStatus;
  elapsedMinutes: number;
  allowedMinutes: number;
  onPress?: (slotId: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 30) / 2; // 10px padding on each side + 10px gap

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes * 60) % 60);
  return `${hours.toString().padStart(2, '0')}h:${mins.toString().padStart(2, '0')}m:${secs.toString().padStart(2, '0')}s`;
}

export function SlotCard({
  slotId,
  slotName,
  status,
  elapsedMinutes,
  allowedMinutes,
  onPress,
}: SlotCardProps) {
  const [duration, setDuration] = useState(elapsedMinutes);
  
  // Update duration every second with internal counter
  useEffect(() => {
    setDuration(elapsedMinutes);
    
    if (status === 'vacant' || status === 'add' || status === 'disabled') {
      return;
    }
    
    // Increment every second
    const interval = setInterval(() => {
      setDuration(prev => prev + (1/60)); // Add 1 second as fraction of minute
    }, 1000);
    
    return () => clearInterval(interval);
  }, [elapsedMinutes, status]);
  
  const progress = allowedMinutes > 0 ? Math.min(duration / allowedMinutes, 1) : 0;
  
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
  
  const handlePress = () => {
    onPress?.(slotId);
  };
  
  // Placeholder card for "ADD SLOT"
  if (status === 'add') {
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={[styles.slotName, { color: getSlotNameColor() }]}>--</Text>
          <Text style={[styles.statusLabel, { color: '#444444' }]}>ADD SLOT</Text>
        </View>
        <View style={styles.progressContainer}>
          <CircularProgress
            size={80}
            progress={0}
            isVacant={true}
          />
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.slotName, { color: getSlotNameColor() }]}>{slotName}</Text>
        <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
          {getStatusLabel()}
        </Text>
      </View>
      
      <View style={styles.progressContainer}>
        <CircularProgress
          size={80}
          progress={progress}
          isOvertime={status === 'overtime'}
          isVacant={status === 'vacant'}
        />
      </View>
      
      <Text style={[styles.duration, { color: getDurationColor() }]}>
        {formatDuration(duration)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0909',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#272727',
    width: cardWidth,
    height: 237,
    paddingTop: 20,
    paddingLeft: 12,
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  slotName: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 14,
    fontWeight: '400',
    position: 'absolute',
  },
  statusLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 26,
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
