/**
 * WebSidebar - Desktop sidebar navigation for web
 * Styled to match the mobile tab bar design but in vertical layout
 */

import { Colors, FontFamily, FontSizes, Spacing } from '@/constants/theme';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface NavItem {
  name: string;
  path: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', path: '/(tabs)/dashboard', label: 'DASHBOARD' },
  { name: 'statistics', path: '/(tabs)/statistics', label: 'STATISTICS' },
];

export function WebSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Get current active index
  const activeIndex = pathname.includes('statistics') ? 1 : 0;
  
  // Animate slider when active tab changes
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: false,
      tension: 68,
      friction: 12,
    }).start();
  }, [activeIndex, slideAnim]);
  
  if (Platform.OS !== 'web') {
    return null;
  }
  
  // Interpolate background color: blue -> pink (matching mobile)
  const backgroundColor = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1F4FCE', '#c3257a'],
    extrapolate: 'clamp',
  });
  
  // Interpolate slider position
  const sliderTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56], // Height of each nav item
    extrapolate: 'clamp',
  });
  
  return (
    <View style={styles.sidebar}>
      {/* Full-height accent line on the left */}
      <Animated.View
        style={[
          styles.accentLine,
          { backgroundColor },
        ]}
      />
      
      {/* Logo / App Title - Matching Figma design */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>
          <Text style={styles.park}>Park</Text>
          <Text style={styles.sBlue}>S</Text>
          <Text style={styles.eGreen}>e</Text>
          <Text style={styles.nPink}>n</Text>
          <Text style={styles.sWhite}>s</Text>
          <Text style={styles.eWhite}>e</Text>
          <Text style={styles.dotGreen}>.</Text>
        </Text>
      </View>
      
      {/* Navigation Container */}
      <View style={styles.navContainer}>
        {/* Animated sliding background - like mobile tab bar */}
        <Animated.View
          style={[
            styles.navSlider,
            {
              backgroundColor,
              transform: [{ translateY: sliderTranslateY }],
            },
          ]}
        />
        
        {/* Navigation Items */}
        {NAV_ITEMS.map((item, index) => {
          const isActive = activeIndex === index;
          
          return (
            <Pressable
              key={item.name}
              style={styles.navItem}
              onPress={() => router.push(item.path as any)}
            >
              <Text style={[
                styles.navLabel,
                isActive && styles.navLabelActive,
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      
      {/* Settings button placeholder */}
      <Pressable 
        style={styles.settingsButton}
        onPress={() => console.log('Settings pressed - placeholder')}
      >
        <Text style={styles.settingsIcon}>⚙</Text>
        <Text style={styles.settingsText}>SETTINGS</Text>
      </Pressable>
      
      {/* Status indicator at bottom */}
      <View style={styles.statusContainer}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>System Online</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: Colors.cardBackground,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: Spacing.xl,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  logoText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xl,
    fontWeight: '400',
  },
  park: {
    color: Colors.textPrimary,
  },
  sBlue: {
    color: Colors.accentBlue,
  },
  eGreen: {
    color: Colors.accentGreen,
  },
  nPink: {
    color: Colors.accentPink,
  },
  sWhite: {
    color: Colors.textPrimary,
  },
  eWhite: {
    color: Colors.textPrimary,
  },
  dotGreen: {
    color: Colors.accentGreen,
  },
  navContainer: {
    flex: 1,
    position: 'relative',
  },
  navSlider: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    height: 48,
    borderRadius: 4,
    top: 4,
  },
  navItem: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  navLabel: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.md,
    fontWeight: '400',
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  navLabelActive: {
    color: Colors.textPrimary,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    width: 4,
    top: 0,
    bottom: 0,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.statusOccupied,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingsIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
    color: Colors.textSecondary,
  },
  settingsText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
});
