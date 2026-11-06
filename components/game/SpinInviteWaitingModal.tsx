// components/game/SpinInviteWaitingModal.tsx
// ────────────────────────────────────────────────────────────────────────────
// Sleek Loading / Waiting Acceptance Modal shown to Player A while waiting
// for Player B to accept their Spin invitation.
// ────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";
import { playTickSound } from "../../lib/pinTickAudio";
import { haptics } from "../../lib/haptcs";

interface SpinInviteWaitingModalProps {
  visible: boolean;
  targetUsername: string;
  onCancel: () => void;
}

export default function SpinInviteWaitingModal({
  visible,
  targetUsername,
  onCancel,
}: SpinInviteWaitingModalProps) {
  const { language } = useAuth();
  const isEN = language === "en";

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Pulsing Radar Rings
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: Platform.OS !== "web" }),
        ])
      );
      // Gentle Disc Rotation
      const rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 4000, useNativeDriver: Platform.OS !== "web" })
      );

      pulseLoop.start();
      rotateLoop.start();

      return () => {
        pulseLoop.stop();
        rotateLoop.stop();
      };
    }
  }, [visible, pulseAnim, rotateAnim]);

  if (!visible) return null;

  const spinInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.box}>
          {/* Animated Pulsing Radar Icon */}
          <View style={s.iconContainer}>
            <Animated.View
              style={[
                s.radarRing,
                { transform: [{ scale: pulseAnim }], opacity: 0.35 }
              ]}
            />
            <Animated.View
              style={[
                s.radarRingOuter,
                { transform: [{ scale: pulseAnim }], opacity: 0.15 }
              ]}
            />
            <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
              <View style={s.innerIconCircle}>
                <Ionicons name="aperture" size={32} color="#FF1744" />
              </View>
            </Animated.View>
          </View>

          {/* Title & Target Player */}
          <Text style={s.title}>
            {isEN ? "Waiting for Response" : "ምላሽ በመጠበቅ ላይ"}
          </Text>
          <Text style={s.subtitle}>
            {isEN ? "Waiting for " : "ግብዣ ወደ "}
            <Text style={s.highlightName}>{targetUsername || "Player"}</Text>
            {isEN ? " to accept your Spin invitation..." : " ተልኳል፣ እስኪቀበሉ በመጠበቅ ላይ..."}
          </Text>

          {/* Loading Indicator dots */}
          <View style={s.dotsRow}>
            <View style={[s.dot, { backgroundColor: "#FF1744" }]} />
            <View style={[s.dot, { backgroundColor: "#00BFFF" }]} />
            <View style={[s.dot, { backgroundColor: "#10B981" }]} />
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => {
              haptics.tap();
              playTickSound();
              onCancel();
            }}
            activeOpacity={0.8}
          >
            <Text style={s.cancelBtnText}>{isEN ? "Cancel Invitation" : "ግብዣውን ሰርዝ"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
  },
  box: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0d1322",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 23, 68, 0.3)",
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    ...(Platform.OS === "web" ? {
      boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 23, 68, 0.15)",
    } as any : {
      elevation: 16,
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  radarRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255, 23, 68, 0.4)",
    borderWidth: 1,
    borderColor: "#FF1744",
  },
  radarRingOuter: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 23, 68, 0.2)",
  },
  innerIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#161b2e",
    borderWidth: 1.5,
    borderColor: "#FF1744",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    fontFamily: "Space Grotesk, Inter, sans-serif",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  highlightName: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cancelBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
  },
});
