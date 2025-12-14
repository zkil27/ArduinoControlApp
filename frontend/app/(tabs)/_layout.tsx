import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FontFamily } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 2;
const SLIDER_WIDTH = TAB_WIDTH - 20;
const SWIPE_THRESHOLD = 50;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const slideAnim = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;
  const currentIndex = useRef(state.index);
  
  // Update animation when tab changes externally
  React.useEffect(() => {
    currentIndex.current = state.index;
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: false,
      tension: 68,
      friction: 12,
    }).start();
  }, [state.index, slideAnim]);
  
  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        slideAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new position based on drag
        const basePosition = currentIndex.current * TAB_WIDTH;
        let newPosition = basePosition + gestureState.dx;
        // Clamp position
        newPosition = Math.max(0, Math.min(newPosition, TAB_WIDTH));
        slideAnim.setValue(newPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        let targetIndex = currentIndex.current;
        
        // Determine target based on velocity or distance
        if (Math.abs(vx) > 0.5) {
          // Fast swipe - use velocity direction
          targetIndex = vx > 0 ? 1 : 0;
        } else if (Math.abs(dx) > SWIPE_THRESHOLD) {
          // Slow swipe - use distance
          targetIndex = dx > 0 ? 1 : 0;
        }
        
        // Navigate to target tab
        const targetRoute = state.routes[targetIndex];
        if (targetIndex !== currentIndex.current) {
          navigation.navigate(targetRoute.name);
        } else {
          // Snap back to current position
          Animated.spring(slideAnim, {
            toValue: currentIndex.current * TAB_WIDTH,
            useNativeDriver: false,
            tension: 68,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;
  
  // Interpolate background color: blue -> pink
  const backgroundColor = slideAnim.interpolate({
    inputRange: [0, TAB_WIDTH],
    outputRange: ['#1F4FCE', '#c3257a'],
    extrapolate: 'clamp',
  });
  
  return (
    <View style={styles.tabBarContainer} {...panResponder.panHandlers}>
      {/* Animated sliding background */}
      <Animated.View
        style={[
          styles.tabSlider,
          {
            backgroundColor,
            transform: [{ translateX: Animated.add(slideAnim, 10) }],
            width: SLIDER_WIDTH,
          },
        ]}
      />
      
      {/* Tab buttons */}
      {state.routes.map((route: any, index: number) => {
        const label = route.name === 'dashboard' ? 'DASHBOARD' : 'STATISTICS';
        const isFocused = state.index === index;
        
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
      
      {/* Animated bottom line */}
      <Animated.View
        style={[
          styles.bottomLine,
          { backgroundColor },
        ]}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statistics',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    height: 88,
    paddingBottom: 34,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-start',
  },
  bottomLine: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabSlider: {
    position: 'absolute',
    height: 40,
    borderRadius: 4,
    top: 7,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  tabLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 19,
    fontWeight: '400',
    color: '#ededed',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#ededed',
  },
});
