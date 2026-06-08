import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PreviousWeekWin = {
  snapshotId: string;
  rank: number;
  prize: number;
  weekStart: string;
  weekEnd: string;
} | null;

export default function CongratulationsModal({
  visible,
  previousWeekWin,
  onDismiss,
  isEN,
}: {
  visible: boolean;
  previousWeekWin: PreviousWeekWin;
  onDismiss: () => void;
  isEN: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [visible]);

  if (!previousWeekWin) return null;

  const rank = previousWeekWin.rank;
  const prize = previousWeekWin.prize;

  // Theme per rank
  const themes: Record<number, {
    gradient: string[];
    accent: string;
    icon: string;
    badgeEmoji: string;
    titleColor: string;
    label: string;
    labelEN: string;
  }> = {
    1: {
      gradient: ['#3b2800', '#1a1200', '#0c0c1f'],
      accent: '#facc15',
      icon: '🥇',
      badgeEmoji: '👑',
      titleColor: '#facc15',
      label: 'አሸናፊ — ወርቃማ ዘውድ',
      labelEN: 'CHAMPION — GOLDEN CROWN',
    },
    2: {
      gradient: ['#1a1a25', '#12121c', '#0c0c1f'],
      accent: '#94a3b8',
      icon: '🥈',
      badgeEmoji: '⭐',
      titleColor: '#c0d0e0',
      label: 'ሁለተኛ — ብር',
      labelEN: '2ND PLACE — SILVER',
    },
    3: {
      gradient: ['#2a1800', '#1a1000', '#0c0c1f'],
      accent: '#b45309',
      icon: '🥉',
      badgeEmoji: '🔥',
      titleColor: '#fb923c',
      label: 'ሶስተኛ — ብሮንዝ',
      labelEN: '3RD PLACE — BRONZE',
    },
  };

  const theme = themes[rank] || themes[3];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={congratsStyles.overlay}>
        <Animated.View
          style={[
            congratsStyles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={theme.gradient as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Decorative XO watermarks */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Text style={{ position: 'absolute', top: -30, left: -20, fontSize: 200, fontWeight: '900', color: theme.accent, opacity: 0.04, transform: [{ rotate: '-20deg' }] }}>X</Text>
            <Text style={{ position: 'absolute', bottom: -40, right: -20, fontSize: 180, fontWeight: '900', color: theme.accent, opacity: 0.03, transform: [{ rotate: '15deg' }] }}>O</Text>
          </View>

          {/* Top badge */}
          <View style={[congratsStyles.topBadge, { borderColor: `${theme.accent}30` }]}>
            <Text style={{ fontSize: 48 }}>{theme.icon}</Text>
          </View>

          {/* Badge emoji */}
          <Text style={{ fontSize: 32, marginBottom: 8 }}>{theme.badgeEmoji}</Text>

          {/* Title */}
          <Text style={[congratsStyles.title, { color: theme.titleColor }]}>
            {isEN ? "CONGRATULATIONS!" : "እንኳን ደስ አለዎት!"}
          </Text>

          {/* Rank label */}
          <View style={[congratsStyles.rankPill, { borderColor: `${theme.accent}40`, backgroundColor: `${theme.accent}15` }]}>
            <Text style={[congratsStyles.rankPillText, { color: theme.accent }]}>
              {isEN ? theme.labelEN : theme.label}
            </Text>
          </View>

          {/* Prize amount */}
          <View style={congratsStyles.prizeContainer}>
            <Text style={congratsStyles.prizeLabel}>
              {isEN ? "YOUR PRIZE" : "ሽልማትዎ"}
            </Text>
            <Text style={[congratsStyles.prizeAmount, { color: theme.titleColor }]}>
              {prize} ETB
            </Text>
          </View>

          {/* Description */}
          <Text style={congratsStyles.description}>
            {isEN
              ? `You finished #${rank} on the weekly leaderboard! Your prize of ${prize} Birr has been credited to your account. Keep playing to win more!`
              : `በሳምንታዊ ደረጃ #${rank} ደርሰዋል! ${prize} ብር ሽልማትዎ ወደ ሂሳብዎ ተላልፏል። የበለጠ ለማሸነፍ መጫወትዎን ይቀጥሉ!`}
          </Text>

          {/* X and O decorations on sides */}
          <View style={congratsStyles.xoRow}>
            <Text style={[congratsStyles.xoChar, { color: `${theme.accent}25` }]}>X</Text>
            <View style={[congratsStyles.dividerLine, { backgroundColor: `${theme.accent}15` }]} />
            <Text style={[congratsStyles.xoChar, { color: `${theme.accent}25` }]}>O</Text>
          </View>

          {/* Claim button */}
          <TouchableOpacity
            style={[congratsStyles.claimBtn, { backgroundColor: theme.accent }]}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color="#000" style={{ marginRight: 6 }} />
            <Text style={congratsStyles.claimBtnText}>
              {isEN ? "AWESOME!" : "አስገራሚ!"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const congratsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  topBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  rankPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    marginBottom: 20,
  },
  rankPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  prizeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  prizeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  prizeAmount: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '500',
    paddingHorizontal: 8,
  },
  xoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  xoChar: {
    fontSize: 28,
    fontWeight: '900',
  },
  dividerLine: {
    width: 60,
    height: 1,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  claimBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
});
