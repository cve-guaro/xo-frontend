import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedNotificationBellProps {
  unreadCount: number;
  size?: number;
  iconColor?: string;
  badgeBorderColor?: string;
}

export function AnimatedNotificationBell({
  unreadCount,
  size = 20,
  iconColor = '#a8a7d4',
  badgeBorderColor = '#0c0c1f',
}: AnimatedNotificationBellProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(unreadCount);

  useEffect(() => {
    let interval: any;

    if (unreadCount > 0) {
      const runPulse = () => {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.25,
            duration: 180,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 120,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();
      };

      const runRing = () => {
        Animated.sequence([
          Animated.timing(rotateAnim, { toValue: 1, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(rotateAnim, { toValue: -1, duration: 160, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(rotateAnim, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(rotateAnim, { toValue: -1, duration: 160, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(rotateAnim, { toValue: 0, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
      };

      // Trigger bell ring and badge pulse when count changes
      if (unreadCount !== prevCount.current) {
        runRing();
        runPulse();
      } else {
        // Also ring initially if count is already > 0
        runRing();
      }

      // Ring periodically every 7 seconds
      interval = setInterval(() => {
        runRing();
      }, 7000);
    } else {
      rotateAnim.setValue(0);
      scaleAnim.setValue(1);
    }
    prevCount.current = unreadCount;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [unreadCount, rotateAnim, scaleAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <Ionicons name="notifications-outline" size={size} color={iconColor} />
      </Animated.View>
      {unreadCount > 0 && (
        <View
          style={[
            styles.badge,
            {
              borderColor: badgeBorderColor,
            },
          ]}
        >
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4b4b',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    shadowColor: '#ff4b4b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
});
