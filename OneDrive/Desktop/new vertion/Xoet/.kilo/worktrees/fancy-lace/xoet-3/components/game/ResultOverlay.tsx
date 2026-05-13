// components/game/ResultOverlay.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface ResultOverlayProps {
  visible: boolean;
  outcome: "win" | "lose";
  amount: number;
  onHome: () => void;
  onPlayAgain?: () => void;
}

const CARD_MAX_W = 340;
const CARD_W = Math.min(width - 40, CARD_MAX_W);

type UiMeta = {
  title: string;
  message: string;
  badgeLabel: "WIN" | "LOSE";
  emoji: string;
  border: readonly [string, string, string];
  glow: string;
  primaryGrad: readonly [string, string];
  primaryText: string;
};

// ✅ static meta (no per-render object creation)
const UI_WIN = (amount: number): UiMeta => ({
  title: "Victory!",
  message: `You won ETB ${Number(amount || 0).toLocaleString()} 🎉`,
  badgeLabel: "WIN",
  emoji: "😄",
  border: ["rgba(255,215,0,0.95)", "rgba(124,58,237,0.95)", "rgba(79,70,229,0.90)"],
  glow: "rgba(255,215,0,0.38)",
  primaryGrad: ["#00E5FF", "#3B82F6"],
  primaryText: "Continue",
});

const UI_LOSE = (amount: number): UiMeta => ({
  title: "Game Over",
  message: `You lost ETB ${Number(amount || 0).toLocaleString()}`,
  badgeLabel: "LOSE",
  emoji: "😔",
  border: ["rgba(255,107,107,0.95)", "rgba(124,58,237,0.92)", "rgba(10,12,28,0.92)"],
  glow: "rgba(255,107,107,0.32)",
  primaryGrad: ["#7C3AED", "#4F46E5"],
  primaryText: "Go Home",
});

function ResultOverlay({ visible, outcome, amount, onHome, onPlayAgain }: ResultOverlayProps) {
  const isWin = outcome === "win";
  const appear = useRef(new Animated.Value(0)).current;

  const ui = useMemo<UiMeta>(() => (isWin ? UI_WIN(amount) : UI_LOSE(amount)), [isWin, amount]);

  useEffect(() => {
    // stop work when hidden
    if (!visible) {
      appear.stopAnimation();
      appear.setValue(0);
      return;
    }

    // only vibrate when opening
    if (Platform.OS === "android") Vibration.vibrate(60);

    appear.stopAnimation();
    appear.setValue(0);

    Animated.timing(appear, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, appear]);

  const cardAnimStyle = useMemo(
    () => ({
      opacity: appear,
      transform: [
        { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1] }) },
      ],
    }),
    [appear]
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[styles.card, cardAnimStyle]}>
          <LinearGradient
            colors={ui.border}
            start={START}
            end={END}
            style={[styles.borderGradient, { shadowColor: ui.glow }]}
          >
            {/* Badge */}
            <View style={styles.badgeWrap}>
              {/* Removed extra glass gradient (draw cost) – keep same look */}
              <View style={styles.badgeGlass}>
                <LinearGradient
                  colors={isWin ? WIN_BADGE : LOSE_BADGE}
                  start={START}
                  end={END}
                  style={styles.badgeRing}
                >
                  <View style={styles.badgeCore}>
                    <Text style={styles.badgeEmoji}>{ui.emoji}</Text>
                  </View>
                </LinearGradient>

                <View style={styles.badgeTag}>
                  <Text style={styles.badgeTagText}>{ui.badgeLabel}</Text>
                </View>
              </View>
            </View>

            {/* Inner content */}
            <View style={styles.innerCard}>
              <LinearGradient colors={CONTENT_BG} start={START} end={END} style={styles.contentGradient}>
                <View style={styles.topChips}>
                  <View style={styles.chip}>
                    <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.chipText}>Fair</Text>
                  </View>
                  <View style={styles.chip}>
                    <Ionicons name="flash-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.chipText}>Real-time</Text>
                  </View>
                </View>

                <Text style={styles.title}>{ui.title}</Text>
                <Text style={styles.message}>{ui.message}</Text>

                {!!amount && (
                  <View style={[styles.amountPill, isWin ? styles.amountPillWin : styles.amountPillLose]}>
                    <Ionicons name={isWin ? "cash-outline" : "alert-circle-outline"} size={14} color="#fff" />
                    <Text style={styles.amountText}>
                      {isWin
                        ? `Prize: ETB ${Number(amount || 0).toLocaleString()}`
                        : `Stake: ETB ${Number(amount || 0).toLocaleString()}`}
                    </Text>
                  </View>
                )}

                <TouchableOpacity onPress={onHome} activeOpacity={0.92} style={styles.btnWrap}>
                  <LinearGradient colors={ui.primaryGrad} style={styles.btn}>
                    <Ionicons name="home-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>{ui.primaryText}</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.92)" />
                  </LinearGradient>
                </TouchableOpacity>


                <View style={styles.decorTop} />
                <View style={styles.decorBottom} />
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(ResultOverlay);

// ---------- constants (smaller runtime work) ----------
const START = { x: 0, y: 0 } as const;
const END = { x: 1, y: 1 } as const;

const CONTENT_BG = ["rgba(15, 17, 23, 0.88)", "rgba(10, 12, 28, 0.84)"] as const;
const WIN_BADGE = ["rgba(255,215,0,0.96)", "rgba(255,237,78,0.85)"] as const;
const LOSE_BADGE = ["rgba(255,107,107,0.95)", "rgba(244,63,94,0.85)"] as const;

// ------------------ Styles ------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.44)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: { width: CARD_W, borderRadius: 26, overflow: "visible" },

  borderGradient: {
    borderRadius: 26,
    padding: 3,
    overflow: "visible",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },

  badgeWrap: {
    position: "absolute",
    top: -34,
    alignSelf: "center",
    zIndex: 60,
    elevation: 60,
  },

  // ✅ replaced gradient glass with a single view
  badgeGlass: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },

  badgeRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  badgeCore: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  badgeEmoji: {
    fontSize: 30,
    lineHeight: 34,
  },

  badgeTag: {
    position: "absolute",
    bottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  badgeTagText: { color: "#fff", fontWeight: "900", fontSize: 10, letterSpacing: 0.7 },

  innerCard: { borderRadius: 23, overflow: "hidden" },

  contentGradient: {
    padding: 22,
    paddingTop: 58,
    alignItems: "center",
  },

  topChips: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipText: { color: "rgba(255,255,255,0.92)", fontWeight: "800", fontSize: 12 },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  message: {
    fontSize: 15.5,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    marginBottom: 14,
    fontWeight: "700",
    lineHeight: 22,
  },

  amountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  amountPillWin: { backgroundColor: "rgba(255,215,0,0.12)", borderColor: "rgba(255,215,0,0.22)" },
  amountPillLose: { backgroundColor: "rgba(255,107,107,0.10)", borderColor: "rgba(255,107,107,0.20)" },
  amountText: { color: "#fff", fontWeight: "900", fontSize: 12.5 },

  btnWrap: { borderRadius: 16, overflow: "hidden", width: "100%" },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15, flexShrink: 0 },

  decorTop: {
    position: "absolute",
    top: -24,
    right: -24,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decorBottom: {
    position: "absolute",
    bottom: -34,
    left: -34,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
