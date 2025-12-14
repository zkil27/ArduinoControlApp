/**
 * About Us Modal
 * Shows team information and project details
 */

import { Colors, FontFamily, FontSizes, Spacing } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none" // Fade happens via opacity/layout, or we can use 'fade'
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={e => e.stopPropagation()}
            style={styles.modal}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>ABOUT US</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.content}>
              <Text style={styles.appName}>
                <Text style={{color: Colors.textPrimary}}>Park</Text>
                <Text style={{color: Colors.accentBlue}}>S</Text>
                <Text style={{color: Colors.accentGreen}}>e</Text>
                <Text style={{color: Colors.accentPink}}>n</Text>
                <Text style={{color: Colors.textPrimary}}>s</Text>
                <Text style={{color: Colors.textPrimary}}>e</Text>
              </Text>
              
              <Text style={styles.version}>Version 1.0.0</Text>
              
              <Text style={styles.description}>
                Smart Parking System powered by Arduino and React Native.
                Real-time monitoring and control for efficient parking management.
              </Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionTitle}>THE TEAM</Text>
              
              <Text style={styles.teamMember}>• Lead Developer</Text>
              <Text style={styles.teamMember}>• UI/UX Designer</Text>
              <Text style={styles.teamMember}>• Embedded Engineer</Text>
              
              <TouchableOpacity 
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Text style={styles.actionButtonText}>CLOSE</Text>
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
    padding: Spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  closeButton: {
    fontFamily: FontFamily.mono,
    fontSize: 20,
    color: Colors.textSecondary,
  },
  content: {
    alignItems: 'center',
  },
  appName: {
    fontFamily: FontFamily.mono,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  version: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  description: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: Colors.border,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Colors.accentGreen,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  teamMember: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
    paddingLeft: 40,
  },
  actionButton: {
    marginTop: 32,
    backgroundColor: Colors.accentPink,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1.5,
  },
});
