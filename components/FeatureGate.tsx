import React from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConstructIcon } from './SvgIcons';
import { useFeatures } from '../context/FeatureContext';
import { useAuth } from '../context/authContext';

const { width, height } = Dimensions.get('window');

export const FeatureGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isEmergencyLocked, lockdownWhitelist, loading } = useFeatures();
  const { user } = useAuth();

  // Allow bypass for superadmin and maintenance roles even if they are not explicitly in whitelist,
  // since the backend `Security.js` also allows them.
  const isMaintenanceAdmin = user?.role === 'superadmin' || user?.role === 'maintenance' || user?.role === 'maintenance_admin';

  // Check if user is in the whitelist by phone number or username
  const isWhitelisted = (() => {
    if (!user || !lockdownWhitelist.length) return false;
    const userNumber = (user as any)?.number ? String((user as any).number).replace(/\+/g, '') : '';
    const username = user?.username || '';
    return lockdownWhitelist.some(entry => {
      const clean = String(entry).replace(/\+/g, '');
      return (userNumber && clean === userNumber) || (username && clean === username);
    });
  })();

  if (loading) return null; // Or return a loader

  if (isEmergencyLocked && !isMaintenanceAdmin && !isWhitelisted) {
    return <EmergencyLockoutScreen />;
  }

  return <>{children}</>;
};

const EmergencyLockoutScreen = () => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e1b4b', '#000000']} style={StyleSheet.absoluteFill} />
      
      {/* Background rotating glow */}
      <Animated.View style={[styles.glowRing, { transform: [{ rotate: spin }, { scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['rgba(0,218,243,0.2)', 'transparent', 'rgba(0,218,243,0.2)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.iconContainer}>
            <ConstructIcon size={60} color="#00daf3" />
          </View>
        </Animated.View>

        <Text style={styles.title}>System Maintenance</Text>
        <Text style={styles.subtitle}>
          We are currently upgrading our platform to serve you better. 
          Please check back in a few minutes.
        </Text>

        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>Servers are being updated</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  glowRing: {
    position: 'absolute',
    width: Math.max(width, height),
    height: Math.max(width, height),
    borderRadius: Math.max(width, height) / 2,
    borderWidth: 2,
    borderColor: 'rgba(0,218,243,0.1)',
  },
  content: {
    alignItems: 'center',
    padding: 30,
    maxWidth: 500,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' }
    })
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,218,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,218,243,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.2)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00daf3',
    marginRight: 8,
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  badgeText: {
    color: '#00daf3',
    fontSize: 14,
    fontWeight: '600',
  }
});
