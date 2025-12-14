import { BillingConfig, FontFamily } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { HoldToConfirmButton } from './HoldToConfirmButton';
import type { SlotStatus } from './SlotCard';

export interface SlotDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  slotName: string;
  status: SlotStatus;
  startTime?: Date;
  elapsedMinutes: number;
  allowedMinutes: number;
  sensorValue?: number;
  isDisabled?: boolean;
  onPingLED: () => Promise<void>;
  onDisable: () => Promise<void>;
  commandLoading?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes * 60) % 60);
  return `${hours.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m : ${secs.toString().padStart(2, '0')}s`;
}

function calculateBilling(minutesParked: number): { amount: number; isOvertime: boolean } {
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
  };
}

export function SlotDetailsModal({
  visible,
  onClose,
  slotName,
  status,
  startTime,
  elapsedMinutes,
  allowedMinutes,
  sensorValue = 0,
  isDisabled = false,
  onPingLED,
  onDisable,
  commandLoading = false,
}: SlotDetailsModalProps) {
  const [currentElapsed, setCurrentElapsed] = useState(elapsedMinutes);
  const [isPinging, setIsPinging] = useState(false);
  
  // Reset elapsed when modal opens or elapsedMinutes changes
  useEffect(() => {
    setCurrentElapsed(elapsedMinutes);
  }, [elapsedMinutes, visible]);
  
  // Update duration every second when modal is visible
  useEffect(() => {
    if (!visible || status === 'vacant' || status === 'add' || status === 'disabled' || isDisabled) {
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentElapsed(prev => prev + (1/60)); // Add 1 second
    }, 1000);
    
    return () => clearInterval(interval);
  }, [visible, status, isDisabled]);
  
  const duration = formatDuration(currentElapsed);
  const billing = useMemo(() => calculateBilling(currentElapsed), [currentElapsed]);
  
  const handlePing = async () => {
    setIsPinging(true);
    try {
      await onPingLED();
    } finally {
      setIsPinging(false);
    }
  };
  
  const handleDisable = async () => {
    await onDisable();
  };
  
  const getStatusColor = (): string => {
    switch (status) {
      case 'occupied': return '#42bc2b';
      case 'overtime': return '#ba2d2d';
      case 'vacant': return '#444444';
      case 'disabled': return '#444444';
      default: return '#444444';
    }
  };
  
  const getStatusLabel = (): string => {
    switch (status) {
      case 'occupied': return 'OCCUPIED';
      case 'overtime': return 'OVERTIME';
      case 'vacant': return 'VACANT';
      case 'disabled': return 'DISABLED';
      default: return '';
    }
  };
  
  const sensorPercent = Math.round((sensorValue / 1023) * 100);
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.slotName}>{slotName}</Text>
            <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="#ededed"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
          
          {/* Time Info */}
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>
              Since: {startTime ? `${formatTime(startTime)} Today` : '--'}
            </Text>
            <Text style={styles.duration}>{duration}</Text>
          </View>
          
          {/* Billing */}
          <View style={styles.billingSection}>
            <Text style={styles.billingLabel}>Billing:</Text>
            <View style={styles.billingRow}>
              <Text style={styles.billingAmount}>
                {BillingConfig.currency} {billing.amount.toFixed(2)}
              </Text>
              <Text style={styles.billingRate}>
                {BillingConfig.currency}{billing.isOvertime ? BillingConfig.overtimeRatePerHour : BillingConfig.ratePerHour}/hr
              </Text>
            </View>
          </View>
          
          {/* Sensor Data */}
          <View style={styles.sensorSection}>
            <View style={styles.sensorHeader}>
              <Text style={styles.sensorLabel}>Sensor Data:</Text>
              <Text style={styles.sensorPercent}>{sensorPercent}%</Text>
            </View>
            <View style={styles.sensorBar}>
              <View style={[styles.sensorFill, { width: `${sensorPercent}%` }]} />
            </View>
          </View>
          
          {/* Actions */}
          <View style={styles.actions}>
            <HoldToConfirmButton
              label={(isDisabled || status === 'disabled') ? 'ENABLE' : 'DISABLE'}
              holdDuration={2000}
              onConfirm={handleDisable}
              disabled={commandLoading}
              variant={(isDisabled || status === 'disabled') ? 'primary' : 'danger'}
            />
            
            <TouchableOpacity
              style={[styles.pingButton, (isPinging || commandLoading) && styles.buttonDisabled]}
              onPress={handlePing}
              disabled={isPinging || commandLoading}
            >
              {isPinging ? (
                <ActivityIndicator size="small" color="#121111" />
              ) : (
                <Text style={styles.pingButtonText}>PING</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#0a0909',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#272727',
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: 346,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  slotName: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 24,
    fontWeight: '400',
    width: 60,
  },
  statusLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 20,
    fontWeight: '400',
    flex: 1,
    letterSpacing: 2,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
    width: 60,
    alignItems: 'flex-end',
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  timeLabel: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 16,
  },
  duration: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 16,
  },
  billingSection: {
    marginBottom: 48,
  },
  billingLabel: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 14,
    marginBottom: 0,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  billingAmount: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 32,
    fontWeight: '700',
  },
  billingRate: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 16,
    fontStyle: 'italic',
  },
  sensorSection: {
    marginBottom: 32,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sensorLabel: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 14,
  },
  sensorPercent: {
    color: '#ededed',
    fontFamily: FontFamily.mono,
    fontSize: 14,
  },
  sensorBar: {
    height: 24,
    backgroundColor: '#1e1e1e',
    borderRadius: 1,
    overflow: 'hidden',
  },
  sensorFill: {
    height: '100%',
    backgroundColor: '#ededed',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 40,
    marginTop: 24,
  },
  pingButton: {
    width: 103,
    height: 29,
    backgroundColor: '#ededed',
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  pingButtonText: {
    color: '#121111',
    fontFamily: FontFamily.mono,
    fontSize: 16,
    fontWeight: '400',
  },
});

export default SlotDetailsModal;
