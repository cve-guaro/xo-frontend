// components/game/SearchingView.tsx
// Full-screen futuristic AAA esports Matchmaking Arena view with animated radar, floating neon X/O elements, player info card, and glowing status indicators.
import React, { memo, useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, Platform, TouchableOpacity, StyleSheet, useWindowDimensions, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/authContext";

interface SearchingViewProps {
  onCancel: () => void;
  isMatched?: boolean;
  betMin?: number;
  betMax?: number;
}

const SearchingView = memo(function SearchingView({ onCancel, isMatched, betMin = 10, betMax = 10 }: SearchingViewProps) {
  const { user } = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );

    const rotateLoop = Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );

    pulseLoop.start();
    rotateLoop.start();
    floatLoop.start();

    const ti = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
      floatLoop.stop();
      clearInterval(ti);
    };
  }, [pulse, rotate, floatAnim]);

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

  const spinDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.15] });
  const scale2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.06] });
  const fade1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.15] });
  const fade2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0.3] });

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });

  const usernameDisplay = user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Player");
  const userInitials = usernameDisplay.slice(0, 2).toUpperCase();

  const stakeDisplay = betMin === betMax ? `ETB ${betMin}` : `ETB ${betMin} - ${betMax}`;

  return (
    <View style={styles.container}>
      {/* Clean Dark Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#050814", "#090d20", "#110a28", "#050814"]}
          locations={[0, 0.4, 0.8, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.gridOverlay} />
      </View>

      {/* ── TOP SECTION: Player Status Card (At top, Flat border, No Shadows) ── */}
      <View style={{ width: "100%", paddingTop: Platform.OS === 'ios' ? 36 : 12, zIndex: 10, alignItems: "center" }}>
        <View style={[styles.playerCard, isDesktop && { maxWidth: 420 }]}>
          <View style={styles.playerCardLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerCardName} numberOfLines={1}>{usernameDisplay}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <View style={styles.pulsingDot} />
                <Text style={styles.playerCardStatus}>{isMatched ? 'MATCHED' : 'SEARCHING'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.playerCardDivider} />

          <View style={styles.playerCardRight}>
            <Text style={styles.stakeVal}>{stakeDisplay}</Text>
            <Text style={styles.stakeLabel}>WAGER STAKE</Text>
          </View>
        </View>
      </View>

      {/* ── CENTER SECTION: Radar & Status Text (Centered in middle) ── */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", width: "100%", marginVertical: 10 }}>
        {/* Center Glowing Radar Arena */}
        <View style={styles.orbContainer}>
          <Animated.View style={[
            styles.radarRing,
            { width: 280, height: 280, borderRadius: 140, borderColor: isMatched ? 'rgba(16, 185, 129, 0.4)' : 'rgba(0, 218, 243, 0.25)', opacity: fade1, transform: [{ scale: scale1 }] }
          ]} />
          <Animated.View style={[
            styles.radarRing,
            { width: 220, height: 220, borderRadius: 110, borderColor: isMatched ? 'rgba(52, 211, 153, 0.5)' : 'rgba(168, 85, 247, 0.35)', opacity: fade2, transform: [{ scale: scale2 }] }
          ]} />
          <View style={[styles.radarRingStatic, { width: 160, height: 160, borderRadius: 80 }]} />

          <LinearGradient
            colors={isMatched ? ['#10b981', '#059669'] : ['#00daf3', '#0099ff']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.coreOrb}
          >
            <Ionicons name={isMatched ? 'checkmark' : 'search'} size={32} color={isMatched ? "#ffffff" : "#0c0e1a"} />
          </LinearGradient>
        </View>

        {/* Status Text */}
        <Text style={styles.statusTitle}>
          {isMatched ? 'MATCH FOUND!' : 'FINDING OPPONENT...'}
        </Text>

        {/* Elapsed Timer Pill */}
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={14} color="#00daf3" style={{ marginRight: 6 }} />
          <Text style={styles.timerText}>{timeStr} elapsed</Text>
        </View>
      </View>

      {/* ── BOTTOM SECTION: Cancel Button & Tip (Anchored at very bottom) ── */}
      <View style={{ width: "100%", alignItems: "center", paddingBottom: Platform.OS === 'ios' ? 28 : 12, zIndex: 10 }}>
        <TouchableOpacity 
          onPress={onCancel} 
          disabled={isMatched} 
          style={[styles.cancelBtnWrap, isDesktop && { maxWidth: 360 }]} 
          activeOpacity={0.8}
        >
          <View style={styles.cancelBtnInner}>
            <Ionicons name="close-circle" size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.cancelBtnText}>CANCEL SEARCH</Text>
          </View>
        </TouchableOpacity>


      </View>
    </View>
  );
});

export default SearchingView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#050814',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    borderTopWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.05)',
    backgroundColor: 'rgba(0, 218, 243, 0.015)',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 18, 38, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    zIndex: 10,
  },
  playerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1.2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 218, 243, 0.15)',
    borderWidth: 1.5,
    borderColor: '#00daf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#00daf3',
    fontWeight: '900',
    fontSize: 14,
  },
  playerCardName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00daf3',
  },
  playerCardStatus: {
    color: '#00daf3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  playerCardDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },
  playerCardRight: {
    alignItems: 'flex-end',
    flex: 0.8,
  },
  stakeVal: {
    color: '#00daf3',
    fontSize: 14,
    fontWeight: '900',
  },
  stakeLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  orbContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
    zIndex: 10,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  radarRingStatic: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.15)',
  },
  sweeperArc: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  arcLine: {
    width: 120,
    height: 3,
    backgroundColor: '#00daf3',
    borderRadius: 2,
    shadowColor: '#00daf3',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  coreOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 24,
    letterSpacing: 2,
    zIndex: 10,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.3)',
    zIndex: 10,
  },
  timerText: {
    color: '#00daf3',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  cancelBtnWrap: {
    marginTop: 32,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    zIndex: 10,
  },
  cancelBtnInner: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#f87171',
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 14,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    zIndex: 10,
  },
  tipText: {
    color: 'rgba(0, 218, 243, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
});

