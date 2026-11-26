// components/game/SearchingView.tsx
// ────────────────────────────────────────────────────────────────────────────
// Matchmaking screen — production pass.
// Conforms strictly to XOET UI Quality Standard (Rules U1-U15).
// ────────────────────────────────────────────────────────────────────────────
import React, { memo, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  View,
  Text,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";
import { WebPressable } from "../WebPressable";
import { colors, type, radius, space, metrics } from "../../theme/tokens";
import Avatar from "../ui/Avatar";

interface SearchingViewProps {
  onCancel: () => void;
  isMatched?: boolean;
  betMin?: number;
  betMax?: number;
  gameType?: "xo" | "rps" | "spin";
}

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const RADAR_CYCLE_MS = 2700;
const RADAR_STAGGER_MS = 900;

const SearchingView = memo(function SearchingView({
  onCancel,
  isMatched,
  betMin = 10,
  betMax = 10,
  gameType = "xo",
}: SearchingViewProps) {
  const isRps = gameType === "rps";
  const accentColor = isMatched ? "#10b981" : isRps ? "#f59e0b" : "#00daf3";
  const ringBorderColor = isRps ? "rgba(245, 158, 11, 0.36)" : "rgba(0, 218, 243, 0.36)";
  const ringFillColor = isRps ? "rgba(245, 158, 11, 0.05)" : "rgba(0, 218, 243, 0.04)";
  const sweepSoftColor = isRps ? "rgba(245, 158, 11, 0.22)" : "rgba(0, 218, 243, 0.22)";

  const { user } = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const wave0 = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const corePulse = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (enabled) => {
      setReduceMotion(Boolean(enabled));
    });
    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    const ti = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(ti);
  }, []);

  useEffect(() => {
    const waves = [wave0, wave1, wave2];
    if (reduceMotion || isMatched) {
      waves.forEach((w) => w.setValue(0));
      sweepAnim.setValue(0);
      corePulse.setValue(0);
      return;
    }

    const activeLoops: Animated.CompositeAnimation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    waves.forEach((anim, idx) => {
      anim.setValue(0);
      const startWave = () => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: RADAR_CYCLE_MS,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ])
        );
        activeLoops.push(loop);
        loop.start();
      };

      if (idx === 0) {
        startWave();
      } else {
        timers.push(setTimeout(startWave, idx * RADAR_STAGGER_MS));
      }
    });

    sweepAnim.setValue(0);
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.linear,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(sweepAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    activeLoops.push(sweepLoop);
    sweepLoop.start();

    corePulse.setValue(0);
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(corePulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(corePulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    activeLoops.push(breathLoop);
    breathLoop.start();

    return () => {
      timers.forEach((t) => clearTimeout(t));
      activeLoops.forEach((l) => l.stop());
    };
  }, [wave0, wave1, wave2, sweepAnim, corePulse, reduceMotion, isMatched]);

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60)
    .toString()
    .padStart(2, "0")}`;

  const ringWaveStyle = (anim: Animated.Value, base: number) => ({
    width: base,
    height: base,
    borderRadius: base / 2,
    borderColor: ringBorderColor,
    backgroundColor: ringFillColor,
    opacity: anim.interpolate({
      inputRange: [0, 0.14, 0.6, 1],
      outputRange: [0, 0.6, 0.25, 0],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.36, 1.18],
        }),
      },
    ],
  });

  const sweepRotate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const coreScale = corePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });

  const dotOpacity = corePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.35],
  });

  const usernameDisplay =
    user?.username ||
    (user?.number ? `User ${user.number.slice(-4)}` : "Player");
  const stakeDisplay =
    betMin === betMax ? `${betMin} ETB` : `${betMin} - ${betMax} ETB`;

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
      {/* ── Player status card ───────────────────────────────────────── */}
      <View style={styles.topZone}>
        <View style={[styles.playerCard, isDesktop && { maxWidth: 420 }]}>
          <View style={styles.playerCardLeft}>
            <Avatar
              uri={user?.avatar}
              name={usernameDisplay}
              size="sm"
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.playerCardName} numberOfLines={1}>
                {usernameDisplay}
              </Text>
              <View style={styles.statusRow}>
                <Animated.View
                  style={[
                    styles.pulsingDot,
                    { backgroundColor: accentColor },
                    !isMatched && !reduceMotion && { opacity: dotOpacity },
                  ]}
                />
                <Text
                  style={[
                    styles.playerCardStatus,
                    { color: accentColor },
                  ]}
                >
                  {isMatched ? "Matched" : "Searching"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.playerCardDivider} />

          <View style={styles.playerCardRight}>
            <Text style={styles.stakeVal}>{stakeDisplay}</Text>
            <Text style={styles.stakeLabel}>Wager stake</Text>
          </View>
        </View>
      </View>

      {/* ── Radar + status ───────────────────────────────────────────── */}
      <View style={styles.centerZone}>
        <View style={styles.orbContainer}>
          <Animated.View style={[styles.radarRing, ringWaveStyle(wave0, 256)]} />
          <Animated.View style={[styles.radarRing, ringWaveStyle(wave1, 256)]} />
          <Animated.View style={[styles.radarRing, ringWaveStyle(wave2, 256)]} />

          <View
            style={[
              styles.radarRingStatic,
              isRps && { borderColor: "rgba(245, 158, 11, 0.14)" },
              { width: 204, height: 204, borderRadius: 102 },
            ]}
          />
          <View
            style={[
              styles.radarRingStatic,
              isRps && { borderColor: "rgba(245, 158, 11, 0.18)" },
              { width: 136, height: 136, borderRadius: 68 },
            ]}
          />

          {!isMatched && !reduceMotion && (
            <Animated.View
              style={[
                styles.sweepArc,
                {
                  borderTopColor: accentColor,
                  borderRightColor: sweepSoftColor,
                  transform: [{ rotate: sweepRotate }],
                },
              ]}
            />
          )}

          <Animated.View
            style={[
              styles.coreOrb,
              {
                backgroundColor: accentColor,
                transform: [{ scale: isMatched || reduceMotion ? 1 : coreScale }],
              },
            ]}
          >
            <Ionicons
              name={isMatched ? "checkmark" : isRps ? "flash" : "search"}
              size={28}
              color="#05070e"
            />
          </Animated.View>
        </View>

        <Text style={styles.statusTitle}>
          {isMatched ? "Match found" : "Finding opponent"}
        </Text>
        <Text style={styles.statusSub}>
          {isMatched
            ? "Get ready — starting the match"
            : isRps
            ? "Pairing you in Rock Paper Scissors (Best of 3)"
            : "Pairing you with a nearby player of similar stake"}
        </Text>

        <View style={[styles.timerPill, isRps && { borderColor: "rgba(245, 158, 11, 0.3)" }]}>
          <Ionicons name="time-outline" size={13} color={accentColor} />
          <Text style={[styles.timerText, { color: accentColor }]}>{timeStr} elapsed</Text>
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
          accessibilityRole="button"
          accessibilityLabel="Cancel search"
        >
          <View style={styles.cancelTouch}>
            <Ionicons name="close-circle-outline" size={17} color="#ef4444" />
            <Text style={styles.cancelBtnText}>Cancel search</Text>
          </View>
        </WebPressable>

        <Text style={styles.reassureText}>
          You will not be charged until a match is found
        </Text>
      </View>
      </View>
    </View>
  );
});

export default SearchingView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070e",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
  },
  containerDesktop: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  inner: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
  },
  innerDesktop: {
    maxWidth: 480,
    maxHeight: 640,
  },
  topZone: {
    alignItems: "center",
    zIndex: 2,
  },
  playerCard: {
    width: "100%",
    backgroundColor: "#0d1326",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  playerCardName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00daf3",
  },
  playerCardStatus: {
    color: "#00daf3",
    fontSize: 11,
    fontWeight: "700",
  },
  playerCardDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginHorizontal: 16,
  },
  playerCardRight: {
    alignItems: "flex-end",
  },
  stakeVal: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  stakeLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  centerZone: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  orbContainer: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  radarRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(0, 218, 243, 0.36)",
    backgroundColor: "rgba(0, 218, 243, 0.04)",
  },
  radarRingStatic: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sweepArc: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 2,
    borderColor: "transparent",
  },
  coreOrb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  statusTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  statusSub: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
    marginBottom: 16,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  timerText: {
    color: "#00daf3",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomZone: {
    alignItems: "center",
  },
  cancelBtnWrap: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTouch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  reassureText: {
    color: "#64748b",
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
  },
});
