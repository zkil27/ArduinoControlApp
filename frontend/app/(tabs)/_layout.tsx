import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import {
    Animated,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { FontFamily } from '@/constants/theme';

// Default values, will be updated on layout
const DEFAULT_TAB_WIDTH = 200;
const SWIPE_THRESHOLD = 50;

function CustomTabBar({ state, descriptors, navigation }: any) {
  // Track container width dynamically for responsive layout
  const [containerWidth, setContainerWidth] = React.useState(DEFAULT_TAB_WIDTH * 2);
  const tabWidth = containerWidth / 2;
  const sliderWidth = tabWidth - 20;
  
  const slideAnim = useRef(new Animated.Value(state.index * tabWidth)).current;
  const currentIndex = useRef(state.index);
  const tabWidthRef = useRef(tabWidth);
  
  // Update ref when tabWidth changes
  React.useEffect(() => {
    tabWidthRef.current = tabWidth;
  }, [tabWidth]);
  
  // Handle layout changes
  const onLayout = React.useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      // Update animation position for new width
      const newTabWidth = width / 2;
      slideAnim.setValue(currentIndex.current * newTabWidth);
    }
  }, [containerWidth, slideAnim]);
  
  // Update animation when tab changes externally
  React.useEffect(() => {
    currentIndex.current = state.index;
    Animated.spring(slideAnim, {
      toValue: state.index * tabWidth,
      useNativeDriver: false,
      tension: 68,
      friction: 12,
    }).start();
  }, [state.index, slideAnim, tabWidth]);
  
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
        const currentTabWidth = tabWidthRef.current;
        const basePosition = currentIndex.current * currentTabWidth;
        let newPosition = basePosition + gestureState.dx;
        // Clamp position
        newPosition = Math.max(0, Math.min(newPosition, currentTabWidth));
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
            toValue: currentIndex.current * tabWidthRef.current,
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
    inputRange: [0, tabWidth],
    outputRange: ['#1F4FCE', '#c3257a'],
    extrapolate: 'clamp',
  });
  
  return (
    <View style={styles.tabBarContainer} onLayout={onLayout} {...panResponder.panHandlers}>
      {/* Animated sliding background */}
      <Animated.View
        style={[
          styles.tabSlider,
          {
            backgroundColor,
            transform: [{ translateX: Animated.add(slideAnim, 10) }],
            width: sliderWidth,
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
  // On web, we use the sidebar navigation instead of bottom tabs
  const isWeb = Platform.OS === 'web';
  
  return (
    <Tabs
      tabBar={(props) => isWeb ? null : <CustomTabBar {...props} />}
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
    left: 0,
    right: 0,
    bottom: 0,
    height: 35,
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
