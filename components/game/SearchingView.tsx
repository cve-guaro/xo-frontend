// components/game/SearchingView.tsx
// ────────────────────────────────────────────────────────────────────────────
// Matchmaking screen — production pass.
//  - Concentric radar with phase-offset pulse rings (no gimmick clutter).
//  - Structured status copy: title + supporting line.
//  - Player card: clean divider, quiet typography.
//  - Reassurance line under cancel (reduces search-cancel anxiety).
// ────────────────────────────────────────────────────────────────────────────
import React, { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/authContext";
import { WebPressable } from "../WebPressable";
import { colors, type, radius, space, metrics, elevation } from "../../theme/tokens";

interface SearchingViewProps {
  onCancel: () => void;
  isMatched?: boolean;
  betMin?: number;
  betMax?: number;
}

const SearchingView = memo(function SearchingView({
  onCancel,
  isMatched,
  betMin = 10,
  betMax = 10,
}: SearchingViewProps) {
  const { user } = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.timing(pulseA, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      })
    );
    const loopB = Animated.loop(
      Animated.timing(pulseB, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        delay: 1100, // phase offset — continuous ripple
        useNativeDriver: Platform.OS !== "web",
      })
    );
    loopA.start();
    loopB.start();
    const ti = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => {
      loopA.stop();
      loopB.stop();
      clearInterval(ti);
    };
  }, [pulseA, pulseB]);

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60)
    .toString()
    .padStart(2, "0")}`;

  const ringA = (base: number) => ({
    scale: pulseA.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }),
    opacity: pulseA.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
    width: base,
    height: base,
    borderRadius: base / 2,
  });
  const ringB = (base: number) => ({
    scale: pulseB.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }),
    opacity: pulseB.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
    width: base,
    height: base,
    borderRadius: base / 2,
  });

  const usernameDisplay =
    user?.username ||
    (user?.number ? `User ${user.number.slice(-4)}` : "Player");
  const userInitials = usernameDisplay.slice(0, 2).toUpperCase();
  const stakeDisplay =
    betMin === betMax ? `ETB ${betMin}` : `ETB ${betMin} - ${betMax}`;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#07070E", "#0B0B16", "#0D0A1C", "#07070E"]}
          locations={[0, 0.4, 0.8, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* ── Player status card ───────────────────────────────────────── */}
      <View style={styles.topZone}>
        <View style={[styles.playerCard, isDesktop && { maxWidth: 420 }]}>
          <View style={styles.playerCardLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerCardName} numberOfLines={1}>
                {usernameDisplay}
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.pulsingDot,
                    isMatched && { backgroundColor: colors.successSoft },
                  ]}
                />
                <Text
                  style={[
                    styles.playerCardStatus,
                    isMatched && { color: colors.successSoft },
                  ]}
                >
                  {isMatched ? "MATCHED" : "SEARCHING"}
                </Text>
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

      {/* ── Radar + status ───────────────────────────────────────────── */}
      <View style={styles.centerZone}>
        <View style={styles.orbContainer}>
          <Animated.View style={[styles.radarRing, ringA(260)]} />
          <Animated.View style={[styles.radarRing, ringB(260)]} />
          <View style={[styles.radarRingStatic, { width: 200, height: 200, borderRadius: 100 }]} />
          <View style={[styles.radarRingStatic, { width: 132, height: 132, borderRadius: 66 }]} />

          <LinearGradient
            colors={isMatched ? ["#10b981", "#059669"] : colors.gradCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.coreOrb, isMatched ? elevation.glowGold : elevation.glowPrimary]}
          >
            <Ionicons
              name={isMatched ? "checkmark" : "search"}
              size={30}
              color={isMatched ? "#ffffff" : "#04222B"}
            />
          </LinearGradient>
        </View>

        <Text style={styles.statusTitle}>
          {isMatched ? "MATCH FOUND" : "FINDING OPPONENT"}
        </Text>
        <Text style={styles.statusSub}>
          {isMatched
            ? "Get ready — starting the round"
            : "Pairing you with a nearby player of similar stake"}
        </Text>

        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={13} color={colors.primary} />
          <Text style={styles.timerText}>{timeStr} elapsed</Text>
        </View>
      </View>

      {/* ── Cancel + reassurance ─────────────────────────────────────── */}
      <View style={styles.bottomZone}>
        <WebPressable
          onPress={onCancel}
          disabled={isMatched}
          style={({ pressed }) => [
            styles.cancelBtnWrap,
            pressed && { opacity: 0.85 },
            isMatched && { opacity: 0.5 },
          ]}
        >
          <View style={styles.cancelTouch}>
            <Ionicons name="close-circle" size={17} color={colors.dangerSoft} />
            <Text style={styles.cancelBtnText}>CANCEL SEARCH</Text>
          </View>
        </WebPressable>

        <Text style={styles.reassureText}>
          You won't be charged until a match is found
        </Text>
      </View>
    </View>
  );
});

export default SearchingView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    backgroundColor: colors.bgDeep,
    overflow: "hidden",
  },

  topZone: {
    width: "100%",
    paddingTop: Platform.OS === "ios" ? 36 : 12,
    alignItems: "center",
    zIndex: 10,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    width: "100%",
  },
  playerCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    flex: 1.2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.tintPrimary,
    borderWidth: 1.5,
    borderColor: "rgba(0,218,243,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  playerCardName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  playerCardStatus: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  playerCardDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.divider,
    marginHorizontal: space.md,
  },
  playerCardRight: {
    alignItems: "flex-end",
    flex: 0.8,
  },
  stakeVal: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "800",
  },
  stakeLabel: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 2,
  },

  centerZone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    zIndex: 10,
  },
  orbContainer: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  radarRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(0,218,243,0.4)",
  },
  radarRingStatic: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  coreOrb: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    color: colors.text,
    ...type.display,
    marginTop: space.xxl,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  statusSub: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: space.xl,
    lineHeight: 18,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.tintPrimary,
    paddingHorizontal: space.lg,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginTop: space.lg,
    borderWidth: 1,
    borderColor: "rgba(0,218,243,0.25)",
  },
  timerText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },

  bottomZone: {
    width: "100%",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    zIndex: 10,
  },
  cancelBtnWrap: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.08)",
    overflow: "hidden",
  },
  cancelTouch: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  cancelBtnText: {
    color: colors.dangerSoft,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 13.5,
  },
  reassureText: {
    color: colors.textFaint,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: space.md,
    textAlign: "center",
  },
});
