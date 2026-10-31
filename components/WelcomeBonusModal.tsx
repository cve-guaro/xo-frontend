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
import { playNotificationChime, playTickSound } from '../lib/pinTickAudio';
import { haptics } from '../lib/haptics';

const { width } = Dimensions.get('window');

interface WelcomeBonusModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WelcomeBonusModal({ visible, onClose }: WelcomeBonusModalProps) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      try {
        playNotificationChime();
      } catch {}
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const handleClaim = () => {
    try {
      playTickSound(900);
      haptics.impact();
    } catch {}
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        {/* Ambient Gold Halo */}
        <View style={styles.glow} />

        <Animated.View style={[styles.container, { transform: [{ scale }], opacity }]}>
          <LinearGradient
            colors={['#141a2e', '#0d1220']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.card}
          >
            {/* Top Close Button */}
            <TouchableOpacity
              onPress={handleClaim}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#8b93a7" />
            </TouchableOpacity>

            {/* Header Icon */}
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Ionicons name="gift" size={36} color="#f5b642" />
              </View>
              <Text style={styles.title}>10 ETB WELCOME BONUS</Text>
              <Text style={styles.subtitle}>
                Congratulations! Your 10.00 ETB playable giveaway balance is ready.
              </Text>
            </View>

            {/* Highlight Balance Box */}
            <View style={styles.balanceBox}>
              <Text style={styles.balanceBoxLabel}>PLAYABLE GIVEAWAY GIFT</Text>
              <Text style={styles.balanceBoxAmount}>+10.00 ETB</Text>
            </View>

            {/* Feature Highlights */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <View style={[styles.bulletIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                </View>
                <Text style={styles.detailText}>Instant 10 ETB credited to your account</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.bulletIconWrap, { backgroundColor: 'rgba(0, 218, 243, 0.15)' }]}>
                  <Ionicons name="game-controller" size={16} color="#00daf3" />
                </View>
                <Text style={styles.detailText}>Use it in Tic-Tac-Toe or Spin Wheel battles</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.bulletIconWrap, { backgroundColor: 'rgba(255, 42, 95, 0.15)' }]}>
                  <Ionicons name="shield-checkmark" size={16} color="#ff2a5f" />
                </View>
                <Text style={styles.detailText}>Zero deposit required to start competing</Text>
              </View>
            </View>

            {/* Claim Action Button */}
            <TouchableOpacity style={styles.button} onPress={handleClaim} activeOpacity={0.85}>
              <LinearGradient
                colors={['#f5b642', '#d99726']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>CLAIM & START PLAYING</Text>
                <Ionicons name="arrow-forward" size={18} color="#07090e" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Verify your profile in account settings to join ranked multiplayer matchmaking.
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 9, 14, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  glow: {
    position: 'absolute',
    width: Math.min(width * 1.2, 500),
    height: Math.min(width * 1.2, 500),
    borderRadius: 250,
    backgroundColor: 'rgba(245, 182, 66, 0.08)',
    ...Platform.select({ web: { filter: 'blur(80px)' } as any }),
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 182, 66, 0.35)',
    shadowColor: '#f5b642',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  card: {
    padding: 28,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161c2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#161c2e',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 182, 66, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#f5b642',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  subtitle: {
    color: '#8b93a7',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  balanceBox: {
    backgroundColor: 'rgba(245, 182, 66, 0.08)',
    borderWidth: 1.5,
    borderColor: '#f5b642',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  balanceBoxLabel: {
    color: '#f5b642',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  balanceBoxAmount: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  detailsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111625',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bulletIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#f5b642',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#07090e',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerNote: {
    color: '#8b93a7',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
