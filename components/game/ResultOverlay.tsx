// components/game/ResultOverlay.tsx
import EmojiBar, { EMOJI_GIFS } from "./EmojiBar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from "react-native";

interface ResultOverlayProps {
  visible: boolean;
  outcome: "win" | "lose";
  amount: number;
  onHome: () => void;
  onPlayAgain?: () => void;
  onSendEmoji?: (emoji: string) => void;
  floatingEmoji?: string | null;
  insufficientBalance?: boolean;
}

const CARD_MAX_W = 340;

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
  border: ["rgba(255,215,0,0.95)", "rgba(0,218,243,0.95)", "rgba(0,163,255,0.90)"],
  glow: "rgba(0,218,243,0.38)",
  primaryGrad: ["#00daf3", "#00a3ff"],
  primaryText: "Back to Arena",
});

const UI_LOSE = (amount: number): UiMeta => ({
  title: "Game Over",
  message: `You lost ETB ${Number(amount || 0).toLocaleString()}`,
  badgeLabel: "LOSE",
  emoji: "😔",
  border: ["rgba(255,107,107,0.95)", "rgba(0,218,243,0.92)", "rgba(10,12,28,0.92)"],
  glow: "rgba(255,107,107,0.32)",
  primaryGrad: ["#00daf3", "#00a3ff"],
  primaryText: "Leave Arena",
});

function ResultOverlay({ visible, outcome, amount, onHome, onPlayAgain, onSendEmoji, floatingEmoji, insufficientBalance = false }: ResultOverlayProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardW = Math.min(windowWidth - 32, CARD_MAX_W);

  const isWin = outcome === "win";
  const appear = useRef(new Animated.Value(0)).current;
  const [canContinue, setCanContinue] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const ui = useMemo<UiMeta>(() => (isWin ? UI_WIN(amount) : UI_LOSE(amount)), [isWin, amount]);

  useEffect(() => {
    // stop work when hidden
    if (!visible) {
      appear.stopAnimation();
      appear.setValue(0);
      setCanContinue(false);
      setCountdown(3);
      return;
    }

    // only vibrate when opening
    if (Platform.OS === "android") Vibration.vibrate(60);

    appear.stopAnimation();
    appear.setValue(0);
    setCanContinue(false);
    setCountdown(3);

    Animated.timing(appear, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Enable buttons after 3 seconds with live countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanContinue(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
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
        <Animated.View style={[styles.card, { width: cardW }, cardAnimStyle]}>
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

                <View style={{ width: "100%", flexDirection: "column", gap: 10 }}>
                  <TouchableOpacity onPress={onHome} disabled={!canContinue} activeOpacity={0.92} style={[styles.btnWrap, !canContinue && { opacity: 0.5 }]}>
                    <LinearGradient colors={ui.primaryGrad} style={styles.btn}>
                      <Ionicons name="home-outline" size={18} color="#0c0c1f" />
                      <Text style={styles.btnText}>{ui.primaryText}</Text>
                      {!canContinue && <Text style={{ color: 'rgba(12,12,31,0.6)', fontSize: 11, marginLeft: 'auto', fontWeight: '800' }}>({countdown}s)</Text>}
                      {canContinue && <Ionicons name="chevron-forward" size={16} color="#0c0c1f" style={{ marginLeft: 'auto' }} />}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Play Again / Rematch Button */}
                  {onPlayAgain && (
                    <View>
                      <TouchableOpacity onPress={insufficientBalance ? undefined : onPlayAgain} disabled={!canContinue || insufficientBalance} activeOpacity={0.92} style={[styles.btnWrap, (!canContinue || insufficientBalance) && { opacity: 0.45 }]}>
                        <LinearGradient colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]} style={[styles.btn, { borderWidth: 1, borderColor: insufficientBalance ? "rgba(255,75,75,0.3)" : "rgba(255,255,255,0.15)" }]}>
                          <Ionicons name="refresh-outline" size={18} color="#fff" />
                          <Text style={[styles.btnText, { color: '#fff' }]}>Run It Back! 🔥</Text>
                          {!canContinue && <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginLeft: 'auto', fontWeight: '800' }}>({countdown}s)</Text>}
                        </LinearGradient>
                      </TouchableOpacity>
                      {insufficientBalance && (
                        <Text style={{ color: '#ff6b6b', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 6 }}>
                          ⚠️ Insufficient balance for this rematch
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Emojis at the bottom of the popup */}
                {onSendEmoji && (
                  <View style={{ marginTop: 24, padding: 10, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.3)" }}>
                    <EmojiBar onSend={onSendEmoji} />
                  </View>
                )}


                <View style={styles.decorTop} />
                <View style={styles.decorBottom} />
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Emoji rendered AFTER the card to guarantee it sits on top in the view hierarchy */}
        {floatingEmoji && (
          <View style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            zIndex: 999999,
            elevation: 100,
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
            {EMOJI_GIFS[floatingEmoji] ? (
              <Image 
                source={{ uri: EMOJI_GIFS[floatingEmoji] }} 
                style={{ width: 100, height: 100 }} 
                resizeMode="contain" 
              />
            ) : (
              <Text style={{ fontSize: 80, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12 }}>
                {floatingEmoji}
              </Text>
            )}
          </View>
        )}
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
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    zIndex: 999999,
    ...(Platform.OS === 'web' ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' } as any : {}),
  },

  card: { borderRadius: 26, overflow: "visible" },

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
  btnText: { color: "#0c0c1f", fontWeight: "900", fontSize: 15, flexShrink: 0 },

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
