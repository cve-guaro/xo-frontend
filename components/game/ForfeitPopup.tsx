// components/game/ForfeitPopup.tsx
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type Mode = "confirm" | "notice";

type Props = {
  visible: boolean;
  mode: Mode;
  onCancel: () => void;
  onConfirm?: () => void;    // when mode="confirm"
  onContinue?: () => void;   // when mode="notice"
};

export default function ForfeitPopup({ visible, mode, onCancel, onConfirm, onContinue }: Props) {
  const opacity = useSharedValue(0);
  const slide = useSharedValue(30);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      slide.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
    } else {
      opacity.value = withTiming(0, { duration: 140 });
      slide.value = withTiming(30, { duration: 140 });
    }
  }, [visible]);

  const wrap = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }] }));

  const isConfirm = mode === "confirm";

  return (
    <View pointerEvents={visible ? "auto" : "none"} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, wrap]} />
      <Animated.View style={[StyleSheet.absoluteFill, wrap]}>
        <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.center}>
        <Animated.View style={[styles.sheet, card]}>
          <View style={[styles.iconWrap, { backgroundColor: isConfirm ? "rgba(255,107,107,0.18)" : "rgba(0,225,180,0.18)" }]}>
            <Ionicons name={isConfirm ? "alert-circle" : "checkmark-circle"} size={22} color={isConfirm ? "#ff7979" : "#00E1B4"} />
          </View>

          <Text style={styles.title}>
            {isConfirm ? "Forfeit Match?" : "Opponent Forfeited"}
          </Text>

          <Text style={styles.caption}>
            {isConfirm
              ? "If you leave now, your opponent will win the round."
              : "You win by forfeit. Continue to wrap up the game."}
          </Text>

          <View style={{ height: 10 }} />

          {isConfirm ? (
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onCancel}>
                <Text style={styles.btnGhostText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onConfirm}>
                <Text style={styles.btnDangerText}>Forfeit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onContinue}>
              <Text style={styles.btnPrimaryText}>Continue</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: "rgba(0,0,0,0.5)" },
  center: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0f1117",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center",
  },
  title: { color: "#e5e7eb", fontWeight: "900", fontSize: 18, textAlign: "center", marginTop: 10 },
  caption: { color: "#cbd5e1", textAlign: "center", marginTop: 6 },
  row: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnGhost: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  btnGhostText: { color: "#cbd5e1", fontWeight: "800" },
  btnDanger: { backgroundColor: "#FF6B6B" },
  btnDangerText: { color: "#0b0b0f", fontWeight: "900" },
  btnPrimary: { backgroundColor: "#00E1B4", marginTop: 6 },
  btnPrimaryText: { color: "#0b0b0f", fontWeight: "900" },
});
