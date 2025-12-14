/**
 * WebLayout - Full-width responsive layout for web
 * Shows sidebar navigation on desktop, passes through on mobile
 */

import { Colors } from '@/constants/theme';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { WebSidebar } from './WebSidebar';

interface WebLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  hideSidebar?: boolean;
}

/**
 * Wraps content with sidebar navigation on web
 * On mobile, this just passes through children unchanged
 */
export function WebLayout({ 
  children, 
  style,
  hideSidebar = false,
}: WebLayoutProps) {
  if (Platform.OS !== 'web') {
    // On native, just render children directly
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {!hideSidebar && <WebSidebar />}
      <View style={[styles.content, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
