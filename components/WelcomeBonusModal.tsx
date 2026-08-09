import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface WelcomeBonusModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WelcomeBonusModal({ visible, onClose }: WelcomeBonusModalProps) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.loop(
          Animated.timing(rotate, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: Platform.OS !== 'web',
          })
        ),
      ]).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
      rotate.setValue(0);
    }
  }, [visible]);

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        {/* Ambient Glows */}
        <Animated.View style={[styles.glow, { opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]} />
        
        <Animated.View style={[styles.container, { transform: [{ scale }], opacity }]}>
          <LinearGradient
            colors={['rgba(28, 28, 60, 0.95)', 'rgba(11, 11, 30, 0.98)']}
            style={styles.card}
          >
            {/* Decorative Sparkle Background */}
            <Animated.View style={[styles.pattern, { transform: [{ rotate: rotation }] }]}>
              <Ionicons name="sparkles" size={300} color="rgba(0, 218, 243, 0.03)" />
            </Animated.View>

            <View style={styles.header}>
              <LinearGradient
                colors={['#f5b642', '#d97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrap}
              >
                <Ionicons name="gift" size={34} color="#0B0B0F" />
              </LinearGradient>
              <Text style={styles.title}>🎉 10 ETB Welcome Bonus!</Text>
              <Text style={styles.subtitle}>Congratulations! You've received a 10 ETB playable giveaway balance.</Text>
            </View>

            <View style={{
              backgroundColor: "rgba(245, 182, 66, 0.12)",
              borderWidth: 1.5,
              borderColor: "#f5b642",
              borderRadius: 20,
              paddingVertical: 14,
              paddingHorizontal: 20,
              alignItems: "center",
              marginVertical: 14,
              width: "100%",
            }}>
              <Text style={{ color: "#fef08a", fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>PLAYABLE GIVEAWAY GIFT</Text>
              <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "900", marginTop: 2 }}>+10.00 ETB</Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                <Text style={styles.detailText}>Instant 10 ETB balance credited to your account</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="game-controller" size={18} color="#00daf3" />
                <Text style={styles.detailText}>Use it to play Tic-Tac-Toe or Spin Wheel games</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
              <LinearGradient
                colors={['#f5b642', '#00daf3']}
                style={styles.buttonGradient}
              >
                <Text style={[styles.buttonText, { color: '#0B0B0F' }]}>CLAIM & START PLAYING</Text>
                <Ionicons name="arrow-forward" size={18} color="#0B0B0F" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerNote}>Make sure to verify your profile under account settings to join matchmaking.</Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 6, 20, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(0, 218, 243, 0.15)',
    filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
  },
  container: {
    width: Math.min(width * 0.9, 440),
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  pattern: {
    position: 'absolute',
    top: -100,
    right: -150,
    opacity: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(168, 167, 212, 0.65)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  detailsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailText: {
    color: '#e5e3ff',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  footerNote: {
    color: 'rgba(168, 167, 212, 0.4)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
