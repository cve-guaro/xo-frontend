// components/game/ResultOverlay.tsx
import EmojiBar, { EMOJI_GIFS } from "./EmojiBar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useMemo, useRef } from "react";
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

const CARD_MAX_W = 360;

function ResultOverlay({
  visible,
  outcome,
  amount,
  onHome,
  onPlayAgain,
  onSendEmoji,
  floatingEmoji,
  insufficientBalance = false,
}: ResultOverlayProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardW = Math.min(windowWidth - 32, CARD_MAX_W);

  const isWin = outcome === "win";
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      appear.stopAnimation();
      appear.setValue(0);
      return;
    }

    if (Platform.OS === "android") Vibration.vibrate(50);

    appear.stopAnimation();
    appear.setValue(0);

    Animated.timing(appear, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [visible, appear]);

  const cardAnimStyle = useMemo(
    () => ({
      opacity: appear,
      transform: [
        { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
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
            colors={
              isWin
                ? ["rgba(0, 218, 243, 0.36)", "rgba(34, 197, 94, 0.14)", "#0A0D12"]
                : ["rgba(220, 38, 38, 0.36)", "rgba(220, 38, 38, 0.12)", "#0A0D12"]
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.topGlow}
          >
            {/* Status Seal */}
            <View
              style={[
                styles.sealOuter,
                {
                  backgroundColor: isWin ? "rgba(0, 218, 243, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  borderColor: isWin ? "rgba(0, 218, 243, 0.5)" : "rgba(248, 113, 113, 0.45)",
                },
              ]}
            >
              <View
                style={[
                  styles.sealInner,
                  { backgroundColor: isWin ? "#00DAF3" : "#EF4444" },
                ]}
              >
                <Ionicons
                  name={isWin ? "trophy" : "close"}
                  size={24}
                  color={isWin ? "#07090E" : "#FFFFFF"}
                />
              </View>
            </View>

            <Text style={styles.statusTitle}>
              {isWin ? "Victory" : "Match ended"}
            </Text>

            <Text style={styles.heroAmount}>
              {isWin
                ? `+${Number(amount || 0).toLocaleString()} ETB`
                : `-${Number(amount || 0).toLocaleString()} ETB`}
            </Text>

            <Text style={styles.subCaption}>
              {isWin ? "Prize credited to your wallet" : "Better luck next round"}
            </Text>
          </LinearGradient>

          {/* Actions & Emoji Reactions */}
          <View style={styles.footerBody}>
            <View style={styles.actionsRow}>
              {onPlayAgain && !isWin && (
                <TouchableOpacity
                  onPress={insufficientBalance ? undefined : onPlayAgain}
                  disabled={insufficientBalance}
                  activeOpacity={0.85}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: "#00DAF3" },
                    insufficientBalance && { opacity: 0.45 },
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={16} color="#07090E" />
                  <Text style={[styles.actionBtnText, { color: "#07090E" }]}>Rematch</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onHome}
                activeOpacity={0.85}
                style={[
                  styles.actionBtn,
                  isWin || !onPlayAgain
                    ? { backgroundColor: "#00DAF3" }
                    : {
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.16)",
                      },
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: isWin || !onPlayAgain ? "#07090E" : "#CBD5E1" },
                  ]}
                >
                  Back to lobby
                </Text>
              </TouchableOpacity>
            </View>

            {insufficientBalance && onPlayAgain && !isWin && (
              <Text style={styles.insufficientText}>
                Insufficient balance for this rematch
              </Text>
            )}

            {onSendEmoji && (
              <View style={styles.emojiBarWrap}>
                <EmojiBar onSend={onSendEmoji} />
              </View>
            )}
          </View>
        </Animated.View>

        {floatingEmoji && (
          <View
            style={{
              position: "absolute",
              top: 24,
              left: 0,
              right: 0,
              zIndex: 999999,
              elevation: 100,
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {EMOJI_GIFS[floatingEmoji] ? (
              <Image
                source={{ uri: EMOJI_GIFS[floatingEmoji] }}
                style={{ width: 96, height: 96 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: 72 }}>{floatingEmoji}</Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

export default memo(ResultOverlay);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    zIndex: 999999,
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
        } as any)
      : {}),
  },
  card: {
    backgroundColor: "#0A0D12",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  topGlow: {
    width: "100%",
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  sealOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  sealInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subCaption: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 8,
  },
  footerBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  insufficientText: {
    color: "#F87171",
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
  },
  emojiBarWrap: {
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
});
