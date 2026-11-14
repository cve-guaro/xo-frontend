// components/game/SearchingView.tsx
// ────────────────────────────────────────────────────────────────────────────
// Matchmaking screen — production pass.
// Conforms strictly to XOET UI Quality Standard (Rules U1-U15).
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

const SearchingView = memo(function SearchingView({
  onCancel,
  isMatched,
  betMin = 10,
  betMax = 10,
  gameType = "xo",
}: SearchingViewProps) {
  const isRps = gameType === "rps";
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
        delay: 1100,
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
  const stakeDisplay =
    betMin === betMax ? `${betMin} ETB` : `${betMin} - ${betMax} ETB`;

  return (
    <View style={styles.container}>
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
                <View
                  style={[
                    styles.pulsingDot,
                    isMatched && { backgroundColor: "#10b981" },
                  ]}
                />
                <Text
                  style={[
                    styles.playerCardStatus,
                    isMatched && { color: "#10b981" },
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
          <Animated.View style={[styles.radarRing, ringA(260)]} />
          <Animated.View style={[styles.radarRing, ringB(260)]} />
          <View style={[styles.radarRingStatic, { width: 200, height: 200, borderRadius: 100 }]} />
          <View style={[styles.radarRingStatic, { width: 132, height: 132, borderRadius: 66 }]} />

          <View style={[styles.coreOrb, { backgroundColor: isMatched ? "#10b981" : "#00daf3" }]}>
            <Ionicons
              name={isMatched ? "checkmark" : "search"}
              size={28}
              color="#05070e"
            />
          </View>
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

        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={13} color="#00daf3" />
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
  );
});

export default SearchingView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070e",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
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
    paddingVertical: 16,
  },
  orbContainer: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  radarRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.25)",
    backgroundColor: "rgba(0, 218, 243, 0.03)",
  },
  radarRingStatic: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
