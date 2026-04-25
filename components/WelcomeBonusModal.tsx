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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface WelcomeBonusModalProps {
  visible: boolean;
  onClose: () => void;
  amount?: number;
}

export default function WelcomeBonusModal({ visible, onClose, amount = 10 }: WelcomeBonusModalProps) {
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
              <Ionicons name="sparkles" size={300} color="rgba(166, 140, 255, 0.03)" />
            </Animated.View>

            <View style={styles.header}>
              <LinearGradient
                colors={['#7C3AED', '#22D3EE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrap}
              >
                <Ionicons name="gift" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>Welcome Gift Drop!</Text>
              <Text style={styles.subtitle}>You've been selected for a special user acquisition drop.</Text>
            </View>

            <View style={styles.amountSection}>
              <View style={styles.amountBadge}>
                <Text style={styles.currency}>ETB</Text>
                <Text style={styles.amount}>{amount}</Text>
              </View>
              <Text style={styles.bonusText}>CASH BONUS LOADED</Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="flash" size={16} color="#34d399" />
                <Text style={styles.detailText}>Instant Deployment to Bonus Balance</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="game-controller" size={16} color="#a68cff" />
                <Text style={styles.detailText}>Use it to win real matches & payouts</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Claim Treasure & Start Playing</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerNote}>Bonus funds are non-withdrawable but winnings are 100% yours.</Text>
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
    backgroundColor: 'rgba(124, 77, 255, 0.15)',
    filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
  },
  container: {
    width: Math.min(width * 0.9, 440),
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#7C3AED',
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
  amountSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(166, 140, 255, 0.3)',
  },
  currency: {
    color: '#a68cff',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  amount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },
  bonusText: {
    color: '#a68cff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 12,
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
